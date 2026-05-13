## Context

A extensão usa o **Page Bridge Pattern**: popup/background → content script (ISOLATED world) → `window.postMessage` → page bridge (MAIN world) → `globalThis.WPP`. O page bridge atual chama `WPP.chat.sendTextMessage()` diretamente, sem nenhuma etapa comportamental. O único mecanismo anti-ban é um `setTimeout` de 6-11s no background entre contatos.

O WPPConnect WA-JS v3.22.0 expõe APIs de presença e interação com a UI que não estão sendo usadas. Os nomes corretos (diferentes do esperado) são:

| Comportamento desejado | API real (confirmada no bundle) |
|---|---|
| Mostrar "digitando..." | `WPP.chat.markIsComposing(chatId, duration?)` |
| Parar indicador de digitação | `WPP.chat.markIsPaused(chatId)` |
| Marcar chat como lido + enviar ticks azuis | `WPP.chat.markIsRead(chatId)` |
| Abrir chat (scroll ao final) | `WPP.chat.openChatBottom(chatId, chatEntryPoint?)` |
| Ler últimas mensagens | `WPP.chat.getMessages(chatId, { count: N })` |
| Verificar se contato existe | `WPP.contact.queryWidExists(contactId)` |

**Restrições técnicas importantes:**
- Content script NÃO tem acesso a `globalThis.WPP` (mundo isolado)
- Comunicação content script ↔ page bridge é assíncrona via `window.postMessage` com `requestId`
- Timeout atual do content script é fixo em 2500ms (`PAGE_BRIDGE_TIMEOUT_MS`) — insuficiente para humanização
- Service worker (background) pode ser terminado pelo MV3 a qualquer momento
- WhatsApp Web é SPA — navegações internas não recarregam a página, exigem MutationObserver para re-injeção
- O CSS do WhatsApp Web é ofuscado e muda com frequência — qualquer injeção de DOM deve usar seletores robustos ou posicionamento fixo

## Goals / Non-Goals

**Goals:**
- Pipeline de envio humanizado com 5 etapas: abrir chat, ler, digitar, enviar, pausar
- Velocidade de digitação proporcional ao tamanho da mensagem
- Micro-delays aleatórios entre cada etapa da pipeline (200-800ms)
- Perfis de humanização configuráveis: Conservador, Balanceado, Agressivo, Personalizado
- Modo rajada (burst): 3-5 mensagens rápidas, pausa longa entre rajadas
- FAB persistente no WhatsApp Web mostrando progresso (sem botões de ação — ações ficam no popup)
- Home screen detecta campanhas ativas e exibe card de status
- Timeout dinâmico no content script proporcional ao tempo de humanização
- Recomendações de volume ao importar CSV (>100 alerta, >200 recomenda pausas)
- Badge no ícone da extensão com contagem de enviadas durante campanha ativa

**Non-Goals:**
- Limite diário forçado (hard stop) — só recomendação
- Scroll simulation, mouse movement simulation
- Múltiplas contas WhatsApp (account rotation)
- Rodízio de templates de mensagem (A/B testing)
- Warm-up/cool-down automático por hora do dia
- Suporte a áudio humanizado (PTT continua sem humanização)
- FAB com botões de pause/stop (ações só no popup)
- Suporte a outros sites além do WhatsApp Web

## Decisions

### 1. Pipeline humanizada no page bridge como função única

**Escolha:** Uma função `sendMessageHumanized(phoneNumber, message, humanization)` que executa todas as etapas sequencialmente dentro do page bridge (MAIN world). O background não faz múltiplos round-trips — envia um request enriquecido e recebe o resultado final.

**Alternativa considerada:** Background orquestrar cada etapa com múltiplos `CHAMALEAD_PAGE_*` requests (ex: `START_TYPING`, `SEND_MESSAGE`, `STOP_TYPING` separados). Rejeitada porque 3-5 round-trips por mensagem multiplicam latência e complexidade de timeout, além de fragmentar a lógica comportamental entre background e page bridge.

**Sequência completa da pipeline:**

```
┌──────────────────────────────────────────────────────────────────┐
│              sendMessageHumanized(phone, msg, config)            │
│                                                                  │
│  1. chatId = `${phone}@c.us`                                     │
│                                                                  │
│  2. if config.openChat:                                          │
│       await WPP.chat.openChatBottom(chatId)                      │
│       await randomMicroDelay(300, 600)                           │
│                                                                  │
│  3. if config.readChat:                                          │
│       await WPP.chat.markIsRead(chatId)                          │
│       await WPP.chat.getMessages(chatId, { count: config.readCount }) │
│       await randomMicroDelay(400, 900)                           │
│                                                                  │
│  4. if config.simulateTyping:                                    │
│       await WPP.chat.markIsComposing(chatId)                     │
│       typingMs = calcTypingDuration(msg, config.typingSpeed)     │
│       await sleep(typingMs)                                      │
│                                                                  │
│  5. result = await WPP.chat.sendTextMessage(chatId, message)     │
│                                                                  │
│  6. if config.simulateTyping:                                    │
│       await WPP.chat.markIsPaused(chatId)                        │
│                                                                  │
│  7. await randomMicroDelay(50, 200)                              │
│                                                                  │
│  8. return { success: true, messageId: result.id }               │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Novo message type `CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED`

**Escolha:** Criar um novo request/response type no page bridge em vez de modificar o existente `CHAMALEAD_PAGE_SEND_MESSAGE`, que permanece para compatibilidade (uso interno, testes, futuros usos não-humanizados).

**Payload request:**
```json
{
  "type": "CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED",
  "requestId": "uuid",
  "phoneNumber": "5511999999999",
  "message": "Olá!",
  "humanization": {
    "openChat": true,
    "readChat": true,
    "readCount": 3,
    "simulateTyping": true,
    "typingSpeed": 180
  },
  "estimatedDurationMs": 45000
}
```

**Payload response:**
```json
{
  "type": "CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED_RESULT",
  "requestId": "uuid",
  "success": true
}
```

### 3. Cálculo de timeout dinâmico

**Escolha:** O background pré-calcula o tempo estimado de humanização e o envia como `estimatedDurationMs` no payload. O content script usa `estimatedDurationMs * 1.5` como timeout para aquele request específico (em vez do fixo de 2500ms). Timeout máximo capado em 300000ms (5 minutos).

**Fórmula no background:**
```typescript
function estimateHumanizationDuration(message: string, config: HumanizationConfig): number {
  let duration = 0
  if (config.openChat) duration += 3000
  if (config.readChat) duration += 3500
  if (config.simulateTyping) {
    duration += calcTypingDuration(message, config.typingSpeed)
    duration += 500  // markIsComposing overhead
  }
  duration += 3000    // sendTextMessage worst-case
  duration += 500     // markIsPaused
  return Math.min(duration, 300000)
}
```

### 4. Velocidade de digitação

**Escolha:** `calcTypingDuration(message, speedMsPerChar)` = `message.length * speedMsPerChar * randomVariation(0.85, 1.15)`. A variação de ±15% por caractere introduz imprevisibilidade sem padrão periódico. O resultado é arredondado para inteiro.

**Valores por perfil:**

| Perfil | ms/char base | Exemplo: 100 chars | Exemplo: 300 chars |
|---|---|---|---|
| Conservador | 220 | ~22s (19-25s) | ~66s (56-76s) |
| Balanceado | 150 | ~15s (13-17s) | ~45s (38-52s) |
| Agressivo | 90 | ~9s (8-10s) | ~27s (23-31s) |
| Personalizado | configurável | — | — |

### 5. Perfis de humanização

**Escolha:** 4 perfis — 3 predefinidos + 1 personalizado. O perfil é selecionado no step de revisão da CampaignWizard com cards visuais. O perfil selecionado é propagado via `startBulkSend` payload.

**Estrutura do tipo `HumanizationProfile`:**
```typescript
type HumanizationProfile = 
  | 'conservative'   // Conservador
  | 'balanced'       // Balanceado
  | 'aggressive'     // Agressivo
  | 'custom'         // Personalizado

interface HumanizationConfig {
  profile: HumanizationProfile
  minDelayMs: number      // delay mínimo entre mensagens
  maxDelayMs: number      // delay máximo entre mensagens
  typingSpeedMs: number   // ms por caractere
  openChat: boolean       // abrir chat antes de enviar
  readChat: boolean       // ler mensagens antes de enviar
  readCount: number       // quantas mensagens ler
  simulateTyping: boolean // simular digitação
  burstMode: boolean      // modo rajada (3-5 rápidas, pausa longa)
  burstSize: number       // mensagens por rajada
  burstPauseMs: number    // pausa entre rajadas
}
```

**Valores por perfil:**

| Parâmetro | Conservador | Balanceado | Agressivo |
|---|---|---|---|
| `minDelayMs` | 45000 | 25000 | 12000 |
| `maxDelayMs` | 180000 | 90000 | 50000 |
| `typingSpeedMs` | 220 | 150 | 90 |
| `openChat` | true | true | true |
| `readChat` | true | true | false |
| `readCount` | 5 | 2 | 0 |
| `simulateTyping` | true | true | true |
| `burstMode` | false | true | false |
| `burstSize` | — | 4 | — |
| `burstPauseMs` | — | 300000 | — |

**Tempo estimado para 200 mensagens (msg de 150 chars):**

| Perfil | Tempo total | Ritmo |
|---|---|---|
| Conservador | ~8.5 horas | 1 msg a cada ~2.5 min |
| Balanceado | ~5.5 horas | 1 msg a cada ~1.5 min (rajadas) |
| Agressivo | ~2.5 horas | 1 msg a cada ~45s |

### 6. Algoritmo de delay entre mensagens (burst mode)

**Escolha:** Substituir `getRandomDelay()` (6-11s fixo) por `getHumanizedDelay(state, config)` com suporte a dois modos:

**Modo normal (burstMode = false):**
```
delay = random(minDelayMs, maxDelayMs)
```

**Modo rajada (burstMode = true):**
```
messagesInCurrentBurst = state.sent % config.burstSize
if messagesInCurrentBurst === 0 && state.sent > 0:
    delay = random(config.burstPauseMs * 0.7, config.burstPauseMs * 1.3)
else:
    delay = random(config.minDelayMs, config.maxDelayMs)
```

**Exemplo visual (Balanceado, burstSize=4, burstPause=300s):**
```
[M1]-[28s]-[M2]-[35s]-[M3]-[22s]-[M4]----[320s]----[M5]-[30s]-[M6]...
 └──────── rajada 1 ────────┘  └─ pausa longa ─┘  └─ rajada 2 ─...
```

### 7. FAB overlay no WhatsApp Web

**Escolha:** Content script injeta um elemento `<div>` fixo no canto inferior direito da página, acima do FAB nativo do WhatsApp (`bottom: 100px` para não colidir com "Nova conversa" em `bottom: ~24px`). O elemento usa `position: fixed` e `z-index: 9999`. Sem botões de ação — apenas indicador de progresso.

**Injeção:**
- `createFabOverlay()`: cria o DOM, adiciona ao `<body>`, inicia polling
- `updateFabOverlay(state)`: atualiza texto, barra de progresso, status visual
- `removeFabOverlay()`: remove do DOM se campanha não existe mais
- MutationObserver existente (já usa para re-injeção de scripts) também chama `createFabOverlay()` se detectar campanha ativa após navegação SPA

**Estados visuais do FAB:**

```
COMPACTO (default):
┌──────────────┐
│ 🔵 47/200    │  ← clicável para expandir
└──────────────┘

EXPANDIDO (ao clicar):
┌─────────────────────────┐
│ 🔵 Enviando...      [−] │  ← toggle collapse
│ ┌─────────────────────┐ │
│ │████████░░░░░░░░░░░░░│ │  ← barra de progresso
│ └─────────────────────┘ │
│ 47 de 200 enviados      │
│ 2 falhas                │
│ ─────────────────────── │
│ Gerencie na extensão ↗  │  ← abre o popup
└─────────────────────────┘

STATUS COM CORES:
  🔵 Azul   = enviando (sending)
  🟡 Amarelo = pausado (paused)
  🟢 Verde  = concluído (completed)
  🔴 Vermelho = erro (error)
```

**Persistência em navegação SPA:** O `MutationObserver` existente em `content.ts` (linhas 152-169) detecta mudanças no DOM que indicam navegação. Após re-injeção de scripts, verifica `chrome.storage.local` para `chamalead_bulk_send_state`. Se `status === 'sending' || status === 'paused'`, recria o FAB.

**Polling:** `setInterval` de 2000ms enviando `CHAMALEAD_BULK_SEND_GET_STATE` do content script para o background. Resposta atualiza o FAB. Se `status === 'completed' || status === 'error' || status === 'idle'`, mantém o FAB visível por 30s (estado final), depois remove.

### 8. Home screen campaign detection

**Escolha:** Um `useEffect` no `PopupPage` que, ao montar, envia `CHAMALEAD_BULK_SEND_GET_STATE` ao background. Se retornar `status: 'sending' | 'paused'`, define estado local `hasActiveCampaign` + `campaignSummary`. Um `useInterval` de 5000ms mantém o estado atualizado enquanto na home.

**Card de campanha ativa (substitui "Nova Campanha"):**
```
┌─────────────────────────────────────┐
│ 📊 Campanha em andamento            │
│                                     │
│ 47 de 200 enviados                  │
│ ┌─────────────────────────────────┐ │
│ │████████░░░░░░░░░░░░░░░░░░░░░░░░│ │
│ └─────────────────────────────────┘ │
│                                     │
│ [🔍 Ver campanha]  [⏸ Pausar]      │
└─────────────────────────────────────┘
```

### 9. Proteção anti-sobrescrita

**Escolha:** O handler `CHAMALEAD_BULK_SEND_START` no background verifica `getStoredState()` antes de criar nova campanha. Se estado existente tem `status === 'sending' || status === 'paused'`, retorna erro `{ success: false, error: 'Já existe uma campanha em andamento. Pare a campanha atual antes de iniciar uma nova.' }`. O popup exibe um confirm dialog: "Cancelar campanha atual e iniciar nova?".

### 10. Badge no ícone da extensão

**Escolha:** Durante campanha ativa, background chama `chrome.action.setBadgeText({ text: String(state.sent) })` e `chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' })`. O badge mostra o número de mensagens enviadas. Ao concluir/finalizar, badge muda para verde com contagem final por 5 minutos, depois limpa com `chrome.action.setBadgeText({ text: '' })`.

**Limitação:** O badge suporta até 4 caracteres. Para >9999, mostra "9999+".

### 11. Recomendações de volume no CSV import

**Escolha:** Após parsing do CSV no CampaignWizard, verificar `recipients.length`:

| Contatos | Comportamento |
|---|---|
| > 100 | Banner amarelo: "⚠ Lista com X contatos. Recomendamos o perfil Conservador para segurança. Envios acima de 100/dia aumentam o risco de bloqueio." |
| > 200 | Banner laranja: "⚠ Lista grande detectada (X contatos). Considere dividir em múltiplos dias. Máximo recomendado: 200-300/dia com perfil Conservador." |

Os banners são informativos — não bloqueiam a ação. Aparecem no step de revisão, acima dos cards de perfil.

### 12. Humanização SEMPRE ativa

**Escolha:** O toggle de humanização não existe. Toda campanha usa a pipeline humanizada. O perfil padrão é **Balanceado**. Motivo: o usuário explicitamente quer maximizar anti-ban e a pipeline humanizada é o core da extensão.

## Risks / Trade-offs

- **[Timeouts em mensagens muito longas]** → Mensagens de 500+ caracteres com perfil Conservador podem levar até 120s de digitação. Timeout máximo capado em 300s. Se timeout ocorrer, background marca como `failed` e continua para o próximo contato. Não sabemos se a mensagem foi ou não enviada pelo WhatsApp — estado "incerto".
- **[markIsComposing sem markIsPaused deixa "digitando..." eterno]** → Se `sendTextMessage` falhar após `markIsComposing`, o indicador de digitação pode ficar preso. Mitigação: try/finally no page bridge garante `markIsPaused` mesmo em erro.
- **[FAB pode colidir com atualizações do CSS do WhatsApp]** → WhatsApp ofusca classes CSS. Usamos `position: fixed` com coordenadas absolutas em vez de depender da estrutura do DOM do WhatsApp. Se o WhatsApp mudar o z-index do próprio FAB, ajustamos o nosso.
- **[openChatBottom pode falhar se contato não existe]** → `queryWidExists` é chamado ANTES da pipeline. Se contato não existe, skip imediato sem tentar enviar. Isso também evita o comportamento padrão do WhatsApp de criar chat de "convite".
- **[Rajada muito rápida pode trigger anti-spam]** → O burst mode do Balanceado envia 4 mensagens com ~30s entre elas e depois pausa 5 minutos. Esse padrão é comum em humanos respondendo várias conversas. Mas WhatsApp pode detectar o padrão de rajada repetido. Mitigação: variação aleatória nos tempos (±30%).
- **[Service worker kill durante `setTimeout` de delay]** → Se o worker for terminado durante a espera entre mensagens, ao reiniciar o `continueSending()` no top-level IIFE (linhas 586-592 do background.ts) detecta `status: 'sending'` e retoma. O cálculo de `currentIndex` está correto no stored state, então a próxima mensagem é enviada sem o delay original (delay perdido). Risco baixo pois o intervalo é randomizado de qualquer forma.

## Open Questions

Nenhuma. Todas as decisões de design estão resolvidas acima.
