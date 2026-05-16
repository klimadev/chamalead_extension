## Why

Campanhas de prospecção não têm auditoria persistente. Quando um perfil WhatsApp é banido, não há como rastrear qual perfil foi usado, quantos envios fez, em qual horário, ou com qual configuração de humanização. Além disso, o estado da campanha é efêmero — ao resetar, todos os logs e contadores desaparecem junto com `chrome.storage.local.remove`. Sem histórico, é impossível correlacionar bans com padrões de envio e estabelecer limites.

## What Changes

- **Identificação do perfil WhatsApp**: O page bridge passa a expor o `WID` do usuário logado (`WPP.conn.wid`), permitindo saber qual conta está enviando
- **Auditoria por envio**: Cada mensagem enviada (com sucesso ou falha) gera um registro imutável em IndexedDB com: perfil usado, contato alvo, timestamp, duração, tipo de mensagem, configuração de humanização, posição na campanha
- **Agrupamento por campanha**: Cada campanha ganha um `campaign_id` (UUID), agrupando todos os envios daquela rodada
- **Dashboard de analytics no popup**: Novo painel "Histórico" com cards de resumo (hoje/semana/total), gráfico de envios por hora, lista de últimas campanhas
- **Opção de limpar histórico**: Botão no dashboard para apagar registros antigos

## Capabilities

### New Capabilities

- `profile-identification`: Leitura do WID do WhatsApp logado via page bridge, exposição via content script e uso no background para associar campanhas a um perfil
- `send-audit-log`: Armazenamento persistente em IndexedDB de cada envio individual com metadados completos (perfil, alvo, timestamp, sucesso/falha, duração, tipo, config, campanha)
- `prospecting-analytics-ui`: Dashboard no popup exibindo agregados diários/semanais/totais, envios por hora, últimas campanhas, e botão para limpar histórico

### Modified Capabilities

<!-- Nenhuma capability existente tem requisitos alterados -->
Nenhuma

## Impact

- **public/vendor/chamalead-page-bridge.js**: Novo handler `CHAMALEAD_PAGE_GET_PROFILE` retornando `{ wid, pushname }`
- **src/extension/content.ts**: Relay para o novo tipo de mensagem de profile
- **src/extension/background.ts**: IndexedDB wrapper (open, insert, query), leitura do profile WID no START da campanha, gravação de registro após cada envio, handlers `CHAMALEAD_ANALYTICS_GET` e `CHAMALEAD_ANALYTICS_CLEAR`
- **Novo**: `src/features/whatsapp/AnalyticsDashboard.tsx` — painel de analytics no popup
- **Novo**: `src/features/whatsapp/useAnalytics.ts` — hook para buscar dados via background
- **src/pages/popup/PopupPage.tsx**: Integração do AnalyticsDashboard como nova seção
- **manifest (vite.config.ts)**: Sem alterações necessárias — não há novos recursos web_accessible
