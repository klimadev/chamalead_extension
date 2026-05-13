## Why

O anti-ban atual se resume a um delay fixo de 6-11s entre mensagens — sem simulação de digitação, sem leitura de chat, sem interação com a UI do WhatsApp. Isso limita prospecções seguras a ~50/dia. O objetivo é viabilizar 200-300 prospecções diárias confortáveis, aplicando o mesmo nível de humanização comportamental que usuários experientes já alcançam com a biblioteca WPPConnect. Ao mesmo tempo, corrige o tracking quebrado: quando o popup fecha, o usuário perde toda visibilidade da campanha em andamento.

## What Changes

- Nova pipeline de envio humanizado no page bridge: abrir chat, marcar como lido, simular digitação com velocidade variável, enviar, pausar digitação — tudo ANTES de cada `sendTextMessage`
- FAB persistente injetado no WhatsApp Web (via content script) mostrando progresso da campanha em tempo real, sobrevivendo a fechamento do popup e navegação SPA
- Popup reconecta automaticamente a campanhas ativas na tela home ao abrir, exibindo status e link para o wizard
- Perfis de humanização configuráveis no step de revisão da CampaignWizard: Conservador, Balanceado, Agressivo e Personalizado
- Delays entre mensagens exponencialmente mais variáveis e imprevisíveis, com modo rajada (burst) opcional
- Novo cálculo dinâmico de timeout no content script que acomoda o tempo de humanização (digitação pode levar até 2.5 minutos)
- Recomendações de volume ao importar listas grandes (>100 contatos alerta sobre risco; >200 recomenda pausas)

## Capabilities

### New Capabilities

- `whatsapp-humanization`: Pipeline de envio humanizado no page bridge executando sequência comportamental (openChatBottom → markIsRead → getMessages → markIsComposing → digitar → sendTextMessage → markIsPaused) com velocidades configuráveis, micro-delays aleatórios entre etapas e timeout dinâmico.
- `campaign-overlay`: FAB persistente injetado via content script no DOM do WhatsApp Web. Exibe progresso compacto (X/N), barra de porcentagem, status (enviando/pausado/concluído/erro) e se expande ao clique. Re-injeta automaticamente em navegações SPA. Atualiza a cada 2s via polling ao background.
- `campaign-tracking`: Home screen do popup consulta estado da campanha ao montar (`CHAMALEAD_BULK_SEND_GET_STATE`). Se campanha ativa, mostra card de status com link "Ver campanha". Proteção contra sobrescrita: `CHAMALEAD_BULK_SEND_START` rejeitado se já existe campanha `sending`/`paused`, com resposta de erro para o popup. Badge no ícone da extensão com contagem de enviadas.
- `humanization-settings`: Perfis de humanização (Conservador, Balanceado, Agressivo, Personalizado) expostos no step de revisão da CampaignWizard. Cada perfil define: intervalo entre mensagens, velocidade de digitação, se lê chat antes, se abre chat, modo rajada. Perfil Personalizado expõe sliders/inputs para cada parâmetro. Recomendação de volume ao importar CSV: >100 contatos mostra aviso, >200 mostra alerta de pausa recomendada.

### Modified Capabilities

Nenhum capability existente é alterado em nível de spec.

## Impact

- `public/vendor/chamalead-page-bridge.js`: Nova função `sendMessageHumanized()` e handler para `CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED` com a pipeline comportamental completa. Funções helpers de sleep e cálculo de typing.
- `src/extension/content.ts`: FAB injection (`createFabOverlay`, `updateFabOverlay`, `removeFabOverlay`), polling de campanha via `CHAMALEAD_BULK_SEND_GET_STATE`, re-injeção em navegação SPA, cálculo de timeout dinâmico para mensagens humanizadas, forward do novo message type.
- `src/extension/background.ts`: Nova função `getHumanizedDelay()` substituindo `getRandomDelay()` com suporte a modos (normal/burst), propagação de parâmetros de humanização para o content script, proteção anti-sobrescrita em `CHAMALEAD_BULK_SEND_START`, badge de progresso, cálculo de timeout estimado para mensagens humanizadas.
- `src/features/whatsapp/CampaignWizard.tsx`: Seção de perfil de humanização no step de revisão com cards selecionáveis e modo personalizado expansível.
- `src/features/whatsapp/useBulkSend.ts`: Propagação do perfil de humanização no payload `startBulkSend`.
- `src/features/whatsapp/BulkSendForm.tsx`: Mesma seção de humanização (feature parity com CampaignWizard).
- `src/pages/popup/PopupPage.tsx`: `useEffect` de detecção de campanha ativa, estado `hasActiveCampaign`, card de campanha ativa na home, badge no ícone da extensão.
- `src/pages/popup/HomeDashboard.tsx`: Card condicional "Campanha em andamento" substituindo "Nova Campanha" quando campanha ativa detectada.
- `src/styles/`: Estilos do FAB overlay, painel de humanização, card de campanha ativa.
