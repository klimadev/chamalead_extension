## Context

O ChamaLead usa um sistema de cores teal (#0f766e) e um layout de popup que expõe toda a complexidade de uma vez. O redesign anterior (`refine-popup-module-visuals`) organizou o módulo de atualizações com states visuais e estabeleceu o padrão de "campaign cockpit", mas manteve o teal e não resolveu a sobrecarga de informação para novos usuários.

O popup opera em 380px de largura, com 3 contextos de site (WhatsApp, Instagram, outros) e múltiplos estados aninhados (site detection, WPP readiness, bulk send phases, Instagram profile states, update states). A linguagem atual usa jargão técnico ("WPP conectado", "Sessão autenticada", "OGG/Opus WebCodecs") que não comunica com usuários não-técnicos.

Não há dependências externas novas. O sistema atual é CSS puro com variáveis no `:root`. Não usa Tailwind nem qualquer framework CSS.

## Goals / Non-Goals

**Goals:**

- Substituir 100% dos hardcodes teal por tokens laranja em `global.css` e componentes.
- Tornar o contexto do site imediatamente visível com badge fixo no topo.
- Traduzir todos os labels de status do WhatsApp para linguagem humana (pt-BR).
- Reduzir a densidade visual do BulkSendForm com disclosure progressiva (seções colapsam conforme estado).
- Esconder a complexidade dos 4 codecs de áudio atrás de um fluxo simplificado.
- Dar aos novos usuários um card de boas-vindas com as capacidades e call-to-action.
- Oferecer botão direto para abrir WhatsApp Web em sites não-suportados.

**Non-Goals:**

- Alterar comportamento de envio, parsing CSV, conversão de áudio, verificação de updates ou persistência de settings.
- Adicionar Tailwind, bibliotecas de componentes ou novas dependências.
- Criar logo real ou assets de marca (ícones, favicons).
- Redesenhar a página de Options (apenas alinhamento de cores).
- Implementar animações ou transições complexas.
- Alterar a pipeline de áudio — os 4 codecs continuam rodando em paralelo, só a UI esconde.

## Decisions

### 1. Paleta laranja: tokens CSS variables como única fonte de verdade

Todas as cores de marca viram variáveis CSS no `:root`. Classes que atualmente hardcodam `#0f766e` passam a referenciar `var(--primary)`. Novas variáveis são adicionadas para cobrir os casos que hoje usam cores derivadas inline.

**Tokens:**

```css
:root {
  --primary: #f97316;           /* laranja-500 — ações, links, focus */
  --primary-hover: #ea580c;     /* laranja-600 — hover/pressed */
  --primary-soft: #fff7ed;      /* laranja-50 — fundos accent */
  --primary-border: #fed7aa;    /* laranja-200 — bordas accent */
  --primary-gradient: linear-gradient(135deg, #f97316, #fb923c);
  --progress-gradient: linear-gradient(90deg, #f97316, #fb923c);

  /* Mantidos do sistema atual */
  --primary-strong: #0f172a;    /* preto — botões primários (contraste) */
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --surface-muted: #f1f5f9;
  --line: #dbe4ee;
  --line-strong: #cbd5e1;
  --text: #0f172a;
  --muted: #64748b;

  /* Status — inalterados */
  --success-bg: #ecfdf5;
  --success-fg: #047857;
  --warning-bg: #fffbeb;
  --warning-fg: #b45309;
  --danger-bg: #fef2f2;
  --danger-fg: #b91c1c;
}
```

**Alternativa considerada:** Usar classes utilitárias ou Tailwind. Rejeitado — adicionaria dependência e build step desnecessários para um sistema de 15 variáveis. O CSS atual já é bem estruturado com variáveis.

### 2. Site badge fixo no topo como elemento estrutural

O header atual é um `<Card>` com título "ChamaLead vX.X.X" e conteúdo de status que muda conforme o site. O novo design separa em dois elementos distintos:

```
┌──────────────────────────────────────────┐
│  🔥 ChamaLead                    v0.1.xx │  ← Linha de identidade (sempre igual)
├──────────────────────────────────────────┤
│  📍 WhatsApp Web                  [OK]   │  ← Badge de contexto (muda por site)
│  Pronto pra disparar                     │  ← 1 linha de status humano
└──────────────────────────────────────────┘
```

Implementação: `<header>` com duas seções. A primeira é identidade (nome + versão). A segunda é o status card (substitui o atual `WhatsAppStatusPanel` / `SiteUnavailableCard` / `SiteLoadingCard`).

**Alternativa considerada:** Manter o card unificado como hoje, só mudando cores e texto. Rejeitado — o card unificado esconde a informação mais importante (onde estou?) dentro de um bloco genérico.

### 3. Estados do WhatsApp com labels humanas

Mapeamento completo dos labels atuais para a nova linguagem:

```
DEV                             → HUMANO
─────────────────────────────────────────────────
"WPP conectado"                 → "WhatsApp aberto"
"WPP ausente"                   → "WhatsApp não detectado"
"Sessão autenticada"            → "Login confirmado"
"Sessão não autenticada"        → "Sem login"
"Pronto para enviar"            → "Pronto pra disparar"
"Sessão aguardando autenticação" → "Faça login no WhatsApp"
"Verificando WhatsApp"          → "Verificando WhatsApp..."
"Checando"                      → "Verificando"
"Parcial"                       → "Aguardando login"
"Bloqueado"                     → "Indisponível"
"Envio em massa liberado..."    → "Tudo pronto para começar."
"O WhatsApp abriu, mas..."      → "Abra o WhatsApp e faça login."
"Conecte o WhatsApp Web..."     → "Abra o WhatsApp Web primeiro."
```

O status chip de readiness usa 3 estados visuais (não 4):

```
🟢 Pronto pra disparar         (isReady && isAuthenticated)
🟡 Faça login no WhatsApp      (isReady && !isAuthenticated)
🔴 WhatsApp não detectado      (!isReady && !isLoading)
⏳ Verificando...              (isLoading)
```

**Alternativa considerada:** Manter os 4 níveis com "Parcial". Rejeitado — "Parcial" não comunica ação ao usuário; "Faça login" é direto e acionável.

### 4. Disclosure progressiva no BulkSendForm

O form atual tem 6 seções sempre visíveis. O novo design colapsa seções baseado no estado de envio:

```
ESTADO IDLE (antes de enviar):
┌──────────────────────────────────┐
│ 📋 Contatos             12 nums  │  ← Sempre visível
│ [CSV + textarea de números]      │
├──────────────────────────────────┤
│ 💬 Mensagem                      │  ← Sempre visível
│ [tabs Texto/Áudio + conteúdo]    │
├──────────────────────────────────┤
│ [Iniciar campanha]  [Pausar]     │  ← Ações sempre visíveis
└──────────────────────────────────┘

ESTADO SENDING (durante envio):
┌──────────────────────────────────┐
│ 📋 Contatos        (▶ colapsado) │  ← Colapsa, mostra resumo
│ 💬 Mensagem        (▶ colapsado) │
├──────────────────────────────────┤
│ ████████░░░░  67%               │  ← Progresso visível
│ 8/12 enviados · 1 falha         │
│ ⏸ Pausar    ✕ Cancelar          │
└──────────────────────────────────┘

ESTADO COMPLETED:
┌──────────────────────────────────┐
│ ✓ Campanha concluída            │
│ 12 enviados · 0 falhas          │
│ [Ver logs]  [Nova campanha]     │
└──────────────────────────────────┘
```

Implementação: wrappers condicionais no JSX com base em `progress.status`. As seções "Segurança" e "Logs" são movidas para dentro dos blocos condicionais ou para um `details`/`summary` colapsável.

**Alternativa considerada:** Wizard multi-step com navegação. Rejeitado — adiciona complexidade de navegação sem ganho real num popup de 380px. Disclosure condicional é mais simples e não quebra o fluxo existente.

### 5. Simplificação da UI de áudio

O pipeline de conversão (4 codecs em paralelo) continua rodando. Apenas a UI muda:

**Antes:** 4 cards individuais, cada um com status, player, botão "Selecionar para envio".

**Depois:** Um único bloco:
```
┌──────────────────────────────────┐
│ 🎤 Áudio PTT                     │
│ [Escolher arquivo]               │
│                                  │
│ ⏳ Processando áudio...          │  ← Estado de carregamento
│                                  │
│ ✓ Pronto · audio.mp3 · 12s      │  ← Estado pronto
│ ▶ ──────────●────────────────    │  ← Player único
│ [Trocar]  [Remover]             │
└──────────────────────────────────┘
```

A lógica de seleção do melhor codec funciona assim no estado:
1. Upload → mostra "Processando..." (spinner) enquanto `isLoading` (algum método `converting`)
2. Concluído → seleciona automaticamente o método `auto` (fallback), mostra player
3. Se `auto` falhar, tenta `ogg`, depois `webm`, depois `raw` — automático, sem input do usuário
4. O estado `selectedAudioMethod` e `audioBase64` são setados automaticamente

**Alternativa considerada:** Deixar o usuário escolher o codec manualmente. Rejeitado — usuário não-técnico não sabe nem deve saber o que é OGG/Opus. O sistema já tem fallback automático, a UI só escondia isso.

### 6. Card de boas-vindas para novos usuários

Detecção: `chrome.storage.local` com chave `chamalead_onboarded`. Se ausente, mostra o card.

```
┌──────────────────────────────────┐
│  🟠                              │
│                                  │
│  Bem-vindo ao ChamaLead          │
│                                  │
│  Transforme seu WhatsApp em uma  │
│  central de campanhas.           │
│                                  │
│  ✦ Envio em massa via CSV       │
│  ✦ Áudio em massa (PTT)         │
│  ✦ Variáveis personalizadas     │
│  ✦ Intervalos inteligentes      │
│                                  │
│  ┌────────────────────────────┐  │
│  │   ABRIR WHATSAPP WEB       │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

Depois de clicar em "Abrir WhatsApp Web" ou fechar o card, a chave é setada. O card não aparece mais.

**Alternativa considerada:** Tour guiado ou tooltips. Rejeitado — complexidade desproporcional. Um card estático no primeiro uso é suficiente para o escopo de um popup.

### 7. Botão "Abrir WhatsApp Web" em sites não-suportados

Aparece no header de status quando `siteContext.state === 'resolved' && !siteContext.isSupported`. Abre `https://web.whatsapp.com` em nova aba via `chrome.tabs.create`.

```
┌──────────────────────────────────┐
│  📍 google.com        [Outro site]│
│  Abra o WhatsApp Web para usar   │
│  as ferramentas de campanha.     │
│  ┌────────────────────────────┐  │
│  │  ABRIR WHATSAPP WEB  →     │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Alternativa considerada:** Redirecionar a aba atual. Rejeitado pelo usuário — prefere nova aba.

### 8. Progress bar e gradientes laranja

Todos os gradientes que usavam teal migram para laranja:

```css
/* Antes */
background: linear-gradient(90deg, #0f766e, #22c55e);
background: linear-gradient(135deg, #0f766e, #22c55e);

/* Depois */
background: var(--progress-gradient);    /* #f97316 → #fb923c */
background: var(--primary-gradient);    /* #f97316 → #fb923c */
```

Usar `fb923c` (laranja-400) como cor final do gradiente — mais claro que o primary, criando profundidade sem introduzir outra família de cor (como o verde fazia antes).

## Risks / Trade-offs

- **Laranja pode ser muito quente/vibrante para uso prolongado** → O laranja forte (`#f97316`) é reservado para ações e indicadores de atenção. Fundos e superfícies permanecem neutros (branco/cinza claro). O laranja-50 (`#fff7ed`) é quase branco e serve como fundo accent suave.
- **Disclosure progressiva pode esconder informações que usuários avançados querem ver** → As seções colapsadas mostram resumo (ex: "12 números") e podem ser expandidas com clique. Nenhuma funcionalidade é removida.
- **Detecção de novo usuário via storage.local não é 100% confiável** (limpeza de dados da extensão) → Se a chave for perdida, o card de boas-vindas reaparece. Isso é aceitável e até desejável para re-engajamento.
- **Mudança de labels de status pode confundir usuários existentes** → A transição é imediata e os novos labels são inequívocos. Não há período de coexistência.
- **Seleção automática do codec de áudio pode falhar em edge cases** → O fallback pipeline já existe (`convertAudioWithFallback`). Se falhar completamente, o erro é mostrado de forma amigável: "Não foi possível processar o áudio. Tente outro arquivo."

## Migration Plan

1. **Fase 1 — Tokens laranja no CSS**: Adicionar novas variáveis no `:root`, substituir hardcodes teal. Rodar build para validar. Nenhuma mudança de markup.
2. **Fase 2 — Status humano e site badge**: Refatorar `PopupPage.tsx` — header com badge, labels humanos, botão WhatsApp Web. Testar nos 3 contextos de site.
3. **Fase 3 — Disclosure progressiva**: Reorganizar `BulkSendForm.tsx` com seções condicionais. Testar ciclo completo: idle → sending → paused → completed → reset.
4. **Fase 4 — Simplificação de áudio**: Refatorar a UI de áudio mantendo a pipeline. Testar upload, conversão, seleção automática.
5. **Fase 5 — Welcome card**: Adicionar lógica de detecção de novo usuário e card de boas-vindas.
6. **Fase 6 — Ajustes finos**: Verificar Instagram, Updates, About, Options para consistência de cores.

**Rollback:** Reverter commits de CSS e JSX. Nenhuma migração de dados necessária.

## Open Questions

- O welcome card deve aparecer apenas em site não-suportado ou também no WhatsApp (com mensagem diferente)?
- A tab "Sobre" deve ganhar um link para a tab "Atualizações"?
