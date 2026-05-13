## 1. Tipos e constantes compartilhadas

- [x] 1.1 Criar `src/features/whatsapp/humanization.ts` com tipos `HumanizationProfile`, `HumanizationConfig` e constantes dos 3 perfis predefinidos (`CONSERVATIVE_CONFIG`, `BALANCED_CONFIG`, `AGGRESSIVE_CONFIG`)
- [x] 1.2 Criar função `getProfileConfig(profile: HumanizationProfile, custom?: Partial<HumanizationConfig>): HumanizationConfig` que retorna o config completo
- [x] 1.3 Criar função `estimateCampaignDuration(recipientCount: number, avgMsgLength: number, config: HumanizationConfig): number` que retorna ms estimados
- [x] 1.4 Criar função `formatDuration(ms: number): string` que retorna "X.X horas" ou "X min"
- [x] 1.5 Adicionar `humanizationConfig` ao tipo `StoredBulkSendState` em `background.ts`

## 2. Page Bridge — pipeline humanizada

- [x] 2.1 Adicionar constantes `CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED` e `CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED_RESULT` em `public/vendor/chamalead-page-bridge.js`
- [x] 2.2 Implementar função `randomMicroDelay(minMs, maxMs)` usando `crypto.getRandomValues()` para imprevisibilidade
- [x] 2.3 Implementar função `calcTypingDuration(message, speedMsPerChar)` com variação ±15%
- [x] 2.4 Implementar função `sendMessageHumanized(phoneNumber, message, humanization)` executando pipeline completa: queryWidExists → openChatBottom → markIsRead → getMessages → markIsComposing → sleep → sendTextMessage → markIsPaused (com try/finally)
- [x] 2.5 Adicionar listener no `window.addEventListener('message', ...)` para `CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED`
- [x] 2.6 Garantir que `CHAMALEAD_PAGE_SEND_MESSAGE` legacy continua funcionando sem alterações

## 3. Content Script — suporte a humanização + FAB overlay

- [x] 3.1 Adicionar constantes de request/response type para mensagens humanizadas em `src/extension/content.ts`
- [x] 3.2 Implementar handler `CHAMALEAD_SEND_MESSAGE_HUMANIZED` — forward para page bridge via `window.postMessage` com `estimatedDurationMs * 1.5` como timeout (cap 300s)
- [x] 3.3 Criar função `createFabOverlay()` — injeta `<div>` fixo no WhatsApp Web (`position: fixed; bottom: 100px; right: 20px; z-index: 9999`) com estilos inline
- [x] 3.4 Implementar modo compacto do FAB: círculo colorido (azul/amarelo/verde/vermelho) + texto "X/N"
- [x] 3.5 Implementar modo expandido do FAB: barra de progresso, sent/failed counts, link "Gerencie na extensão"
- [x] 3.6 Implementar toggle compacto/expandido no clique do FAB
- [x] 3.7 Criar função `updateFabOverlay(state)` — atualiza texto, cores e barra baseado no `StoredBulkSendState`
- [x] 3.8 Criar função `removeFabOverlay()` — remove FAB do DOM e para polling
- [x] 3.9 Iniciar polling `setInterval(2000ms)` enviando `CHAMALEAD_BULK_SEND_GET_STATE` ao background para atualizar FAB
- [x] 3.10 Integrar ao MutationObserver existente: após re-injeção de scripts em navegação SPA, verificar campanha ativa e recriar FAB se necessário
- [x] 3.11 Auto-remover FAB 30s após `status` transicionar para `completed`/`error`/`idle`

## 4. Background — delays humanizados + proteção + badge

- [x] 4.1 Substituir `getRandomDelay()` por `getHumanizedDelay(state: StoredBulkSendState, config: HumanizationConfig): number` com suporte a modo rajada
- [x] 4.2 Implementar lógica de burst mode: contar mensagens na rajada atual, após `burstSize` mensagens aplicar pausa longa com ±30% de variação
- [x] 4.3 Criar função `estimateHumanizationDuration(message: string, config: HumanizationConfig): number` (openChat + readChat + typing + send overhead, cap 300s)
- [x] 4.4 Modificar `sendMessageToTab()` para enviar `CHAMALEAD_SEND_MESSAGE_HUMANIZED` com `humanizationConfig` e `estimatedDurationMs` quando config está presente
- [x] 4.5 Manter `sendMessageToTab()` compatível com modo legacy (áudio, mensagens sem config)
- [x] 4.6 Adicionar proteção anti-sobrescrita no handler `CHAMALEAD_BULK_SEND_START`: verificar `getStoredState()`, rejeitar com erro se `status === 'sending' || 'paused'`
- [x] 4.7 Adicionar `chrome.action.setBadgeText()` e `chrome.action.setBadgeBackgroundColor()` no `setStoredState()` quando `sent` muda (azul `#3B82F6` durante envio)
- [x] 4.8 Badge verde `#10B981` por 5 minutos ao concluir, depois limpar
- [x] 4.9 Armazenar `humanizationConfig` no `StoredBulkSendState` ao iniciar campanha
- [x] 4.10 Adicionar campo `humanizationConfig?: HumanizationConfig` ao payload do `CHAMALEAD_BULK_SEND_START`

## 5. Campaign Wizard UI — seleção de perfil de humanização

- [x] 5.1 Adicionar estado `humanizationProfile` e `customConfig` ao `CampaignWizard` (default: `'balanced'`)
- [x] 5.2 Criar componente `HumanizationProfileCards` com 4 cards: Conservador, Balanceado, Agressivo, Personalizado
- [x] 5.3 Cada card mostra: emoji, nome do perfil, label descritivo (ex: "🐢 Envio lento e seguro · ~8.5h/200"), e destaque visual no selecionado
- [x] 5.4 Ao trocar perfil, atualizar estimativa de duração
- [x] 5.5 Implementar painel expansível de Personalizado com sliders/inputs: minDelay (5-600s), maxDelay (5-600s), typingSpeed (50-500ms), openChat toggle, readChat toggle, readCount (1-20), burstMode toggle, burstSize (2-10), burstPause (60-900s)
- [x] 5.6 Validação: minDelay <= maxDelay (auto-ajuste)
- [x] 5.7 Integrar no step de revisão (antes do botão "Iniciar campanha")
- [x] 5.8 Implementar banners de recomendação de volume: >100 contatos (amarelo), >200 contatos (laranja)
- [x] 5.9 Passar `humanizationConfig` no payload de `startBulkSend()`

## 6. BulkSendForm UI — feature parity

- [x] 6.1 Adicionar estado `humanizationProfile` ao `BulkSendForm` (default: `'balanced'`) — **CANCELLED: BulkSendForm.tsx not found in codebase**
- [x] 6.2 Reutilizar componente `HumanizationProfileCards` (ou criar equivalente inline) — **CANCELLED**
- [x] 6.3 Adicionar banners de recomendação de volume (mesma lógica do CampaignWizard) — **CANCELLED**
- [x] 6.4 Passar `humanizationConfig` no payload de `startBulkSend()` — **CANCELLED**

## 7. Popup — tracking e reconexão

- [x] 7.1 Adicionar estado `hasActiveCampaign` e `campaignSummary` ao `PopupPage`
- [x] 7.2 Criar `useEffect` que chama `CHAMALEAD_BULK_SEND_GET_STATE` ao montar o popup
- [x] 7.3 Se campanha ativa detectada, mostrar card condicional "📊 Campanha em andamento" na home (em vez de "Nova Campanha")
- [x] 7.4 Card de campanha ativa mostra: progresso (X/N), barra, status, botão "Ver campanha" (navega para view `campaign`)
- [x] 7.5 Se campanha `paused`, mostrar botão "Retomar" adicional no card
- [x] 7.6 `setInterval(5000ms)` para manter estado do card atualizado enquanto na home
- [x] 7.7 Ao clicar "Ver campanha", navegar para `view = 'campaign'` (CampaignWizard se reconecta via `useBulkSend`)
- [x] 7.8 `useBulkSend`: se `startBulkSend` retornar `{ success: false }` com erro de campanha existente, mostrar confirm dialog "Cancelar atual e iniciar nova?"
- [x] 7.9 Ao confirmar overwrite, enviar `CHAMALEAD_BULK_SEND_STOP` e retry `CHAMALEAD_BULK_SEND_START`

## 8. Validação e build

- [x] 8.1 Rodar `npm run lint` — corrigir erros
- [x] 8.2 Rodar `npm run build` — garantir build passa sem erros
- [x] 8.3 Verificar que `CHANGELOG.md` tem entrada para esta versão
- [x] 8.4 Incrementar versão em `package.json` e `vite.config.ts` (minor: 0.4.2 → 0.5.0 — nova funcionalidade)
- [x] 8.5 Rodar `npm run build` novamente após incremento de versão para validar
