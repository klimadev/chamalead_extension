## Context

O Chamalead gerencia campanhas de prospecção pelo WhatsApp Web. O estado atual (background.ts) é efêmero: ao resetar uma campanha com `clearStoredState()`, todos os logs, contadores e metadados são removidos do `chrome.storage.local`. Não existe identificação do perfil WhatsApp que está enviando (nunca se lê `WPP.conn.wid`), e os logs são strings soltas sem estrutura.

O projeto usa exclusivamente `chrome.storage.local`/`sync` para persistência — nunca usou IndexedDB. A arquitetura de comunicação é: Popup → Background Service Worker → Content Script → Page Bridge (MAIN world) → WPPConnect WA-JS.

## Goals / Non-Goals

**Goals:**
- Registrar cada envio individual em armazenamento persistente com metadados completos
- Identificar o perfil WhatsApp logado (WID) para associar envios a uma conta
- Agrupar envios por campanha (UUID)
- Exibir analytics no popup (hoje, semana, total; envios por hora; últimas campanhas)
- Permitir limpeza manual do histórico

**Non-Goals:**
- Limites automáticos de envio — analytics é informativo, não impositivo
- Dedup automático de contatos — dados brutos, sem lógica de bloqueio
- Exportação de dados (CSV/JSON) — só dashboard visual
- Múltiplos perfis simultâneos — assume um WhatsApp Web por vez; WID é capturado no início da campanha
- Migração de dados antigos (não há histórico anterior para migrar)

## Decisions

### 1. IndexedDB como storage de auditoria

**Escolha**: IndexedDB com uma object store `sends` e índices em `timestamp`, `profile_wid` e `target_phone`.

**Alternativa considerada**: `chrome.storage.local`. Rejeitada porque o limite de ~10MB (~65k envios) seria atingido rapidamente em uso intenso (1000+ envios/dia) e não oferece queries nativas — toda filtragem e agregação seria em memória no service worker.

**Rationale**: IndexedDB é ilimitado na prática, suporta índices compostos e queries por range nativas (`IDBKeyRange`), e funciona no contexto de service worker de extensões Chrome. A API é mais verbosa que `chrome.storage`, mas um wrapper simples isola a complexidade.

### 2. Background service worker como único escritor

**Escolha**: Toda escrita no IndexedDB acontece no background.ts, nunca no popup ou content script.

**Rationale**: O background já é o orquestrador do loop de envio — ele sabe quando um envio é concluído (success/failure), tem acesso ao `StoredBulkSendState` completo e à config de humanização. Evita problemas de concorrência (duas abas de popup escrevendo simultaneamente). O popup apenas lê via `chrome.runtime.sendMessage`.

### 3. Cached profile WID no início da campanha

**Escolha**: Ao iniciar uma campanha (`CHAMALEAD_BULK_SEND_START`), o background faz uma chamada ao page bridge (via content script) para obter `WPP.conn.wid`, e armazena em memória (variável `cachedProfileWid`) para usar em todos os registros daquela campanha.

**Alternativa considerada**: Consultar o WID a cada envio. Rejeitada por adicionar latência desnecessária — o perfil não muda durante uma campanha.

**Rationale**: Uma única chamada assíncrona no START da campanha. Se falhar (WPP não disponível), registra `"unknown"` como WID — melhor ter dado parcial do que bloquear a campanha.

### 4. campaign_id como UUID v4

**Escolha**: UUID gerado com `crypto.randomUUID()` no início de cada campanha.

**Rationale**: Único, não sequencial, nativo no Chrome (disponível em service workers). Permite agrupar todos os envios de uma campanha para consulta e exibição.

### 5. Nova mensagem CHAMALEAD_PAGE_GET_PROFILE

**Escolha**: Adicionar um novo par de mensagens no page bridge: `CHAMALEAD_PAGE_GET_PROFILE` (request) → `CHAMALEAD_PAGE_WPP_PROFILE` (response) retornando `{ wid: string, pushname: string }`.

**Rationale**: Segue o padrão existente de todos os outros handlers no bridge (STATUS, CHATS, GROUPS, etc.). O `WPP.conn.wid` é uma propriedade padrão do WA-JS que expõe o WhatsApp ID do usuário logado.

### 6. Estrutura do IndexedDB

```
Database: chamalead_history (v1)

Object Store: sends
  keyPath: "id" (string UUID)
  
  Indexes:
    by_timestamp   → timestamp (number)
    by_profile     → profile_wid (string)
    by_target      → target_phone (string)
    by_campaign    → campaign_id (string)
```

### 7. Registro de envio (SendRecord)

```typescript
interface SendRecord {
  id: string              // crypto.randomUUID()
  campaign_id: string     // UUID da campanha
  profile_wid: string     // ex: "5511999999999@c.us"
  target_phone: string    // ex: "5511988888888"
  timestamp: number       // Date.now()
  success: boolean
  error_message?: string
  duration_ms: number
  message_type: 'text' | 'audio'
  message_length: number
  humanization_profile?: 'conservative' | 'balanced' | 'aggressive' | 'custom'
  humanization_min_delay?: number
  humanization_max_delay?: number
  campaign_total: number
  campaign_position: number  // 1-based
}
```

### 8. Queries de analytics

O background expõe um handler `CHAMALEAD_ANALYTICS_GET` que aceita parâmetros e retorna dados agregados:

```typescript
interface AnalyticsRequest {
  period: 'today' | 'week' | 'all'
  profile_wid?: string  // opcional, filtra por perfil
}

interface AnalyticsResponse {
  summary: {
    today: { sent: number; failed: number }
    week: { sent: number; failed: number }
    total: { sent: number; failed: number }
  }
  hourly: { hour: number; sent: number; failed: number }[]
  recent_campaigns: {
    campaign_id: string
    started_at: number
    total: number
    sent: number
    failed: number
    profile_wid: string
    humanization_profile?: string
  }[]
}
```

As queries usam `IDBKeyRange.bound()` no índice `by_timestamp` para filtrar por período e iteração para agregações. Para volumes moderados (dezenas de milhares), essa abordagem é performática o suficiente.

### 9. UI: AnalyticsDashboard

Um componente React que ocupa uma nova seção no popup, acessível via navegação (tab ou botão). Estrutura:

```
AnalyticsDashboard
├── SummaryCards (hoje | semana | total)
├── HourlyChart (envios por hora do dia corrente, barras ASCII/horizontais)
└── CampaignList (últimas 10 campanhas, cada uma expansível)
    └── CampaignDetail (expansão: lista de envios da campanha)
```

O hook `useAnalytics` faz polling (a cada 5s) via `chrome.runtime.sendMessage({ type: 'CHAMALEAD_ANALYTICS_GET', period: 'today' })`. Usa o mesmo padrão de `useBulkSend`.

### 10. Limpeza de histórico

Handler `CHAMALEAD_ANALYTICS_CLEAR` no background:
- Sem parâmetros → limpa TUDO (`objectStore.clear()`)
- Com parâmetro `before: number` (timestamp) → limpa registros anteriores à data (`IDBKeyRange.upperBound(before)` no índice `by_timestamp`, depois `cursor.delete()`)

O dashboard expõe um botão "Limpar histórico" com confirmação.

## Risks / Trade-offs

**[Risco] IndexedDB pode ser limpo pelo navegador em condições de espaço baixo**
→ Mitigação: Dados são de auditoria, não críticos para funcionamento da extensão. O pior caso é perder histórico, não impedir envios.

**[Risco] WPP.conn.wid pode não estar disponível ou ter mudado de API em versões futuras do WA-JS**
→ Mitigação: A chamada é envolvida em try/catch; se falhar, usa `"unknown"` como fallback. A campanha continua funcionando normalmente.

**[Trade-off] Sem exportação de dados**
→ O usuário decidiu que dashboard no popup é suficiente. Se surgir demanda futura, a estrutura do IndexedDB facilita adicionar export CSV/JSON depois.

**[Trade-off] Sem dedup automático**
→ O usuário prefere dados brutos. O índice `by_target` existe para consultas manuais futuras se necessário, mas nenhuma lógica de bloqueio é implementada agora.

**[Risco] Performance com histórico muito grande (100k+ registros)**
→ Mitigação: As queries usam índices nativos do IndexedDB, que são eficientes. Agregações são limitadas a períodos (hoje/semana). O dashboard só carrega as últimas 10 campanhas por padrão. Se necessário, paginação pode ser adicionada depois.
