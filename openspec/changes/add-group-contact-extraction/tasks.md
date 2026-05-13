## 1. Page Bridge — novos handlers

- [x] 1.1 Adicionar constantes `CHAMALEAD_PAGE_GET_WPP_GROUPS` e `CHAMALEAD_PAGE_WPP_GROUPS` no `chamalead-page-bridge.js`
- [x] 1.2 Adicionar constantes `CHAMALEAD_PAGE_GET_WPP_PARTICIPANTS` e `CHAMALEAD_PAGE_WPP_PARTICIPANTS` no `chamalead-page-bridge.js`
- [x] 1.3 Implementar `getGroups()` — filtra `WPP.chat.list()` por `isGroup === true`, retorna `{ id, name }` para cada grupo
- [x] 1.4 Implementar `getParticipants(groupId)` — chama `WPP.group.getParticipants(groupId)`, filtra `@lid`, mapeia para `{ phone, is_admin }`
- [x] 1.5 Adicionar listeners no `window.addEventListener('message', ...)` para os dois novos request types

## 2. Content Script — forward das mensagens

- [x] 2.1 Adicionar constantes de request/response type no `content.ts`
- [x] 2.2 Adicionar handler para `CHAMALEAD_GET_WPP_GROUPS` — segue o padrão existente (requestId, timeout 2500ms, postMessage)
- [x] 2.3 Adicionar handler para `CHAMALEAD_GET_WPP_PARTICIPANTS` — mesmo padrão, forward do `groupId`

## 3. Hook React — useGroupExtraction

- [x] 3.1 Criar `src/features/whatsapp/useGroupExtraction.ts`
- [x] 3.2 Implementar `fetchGroups()` — `chrome.tabs.sendMessage` com type `CHAMALEAD_GET_WPP_GROUPS`, retorna `WppGroup[]`
- [x] 3.3 Implementar `extractParticipants(groupId)` — `chrome.tabs.sendMessage` com type `CHAMALEAD_GET_WPP_PARTICIPANTS`, retorna `{ phone, is_admin }[]`
- [x] 3.4 Implementar `downloadCsv(rows)` — gera string CSV com header `group_name,phone,is_admin`, escape de vírgulas/aspas, trigger de download via blob URL

## 4. Componente UI — GroupContactExtraction

- [x] 4.1 Criar `src/features/whatsapp/GroupContactExtraction.tsx`
- [x] 4.2 Estado: lista de grupos com `selected`, progresso da extração, resultado/sumário
- [x] 4.3 UI de seleção: checkbox por grupo, "Selecionar todos", contador de selecionados
- [x] 4.4 Botão "Extrair" (desabilitado se nenhum selecionado, label dinâmico "Extrair N grupos")
- [x] 4.5 Fluxo de extração: itera grupos selecionados, chama `extractParticipants`, acumula rows, mostra progresso
- [x] 4.6 Estados: locked (WhatsApp não pronto), empty (sem grupos), loading, done (sumário + download)

## 5. Popup — integração da view

- [x] 5.1 Adicionar `'group-extraction'` ao tipo `AppView` no `PopupPage.tsx`
- [x] 5.2 Adicionar card "Extrair Contatos" no `HomeDashboard`
- [x] 5.3 Renderizar `GroupContactExtraction` quando `view === 'group-extraction'`
- [x] 5.4 Passar `wppStatus` e `onBack` para o componente

## 6. Validação

- [x] 6.1 Rodar `npm run build` — garantir que build passa sem erros
- [x] 6.2 Rodar `npm run lint` — garantir que não há erros de lint
- [x] 6.3 Testar fluxo completo: abrir WhatsApp Web, listar grupos, selecionar, extrair, verificar CSV
