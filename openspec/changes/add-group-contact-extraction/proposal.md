## Why

Usuários precisam extrair contatos de grupos do WhatsApp para usar em campanhas, planilhas ou CRM. Hoje não há caminho automatizado — a única opção é copiar manualmente participante por participante, o que é inviável para grupos com dezenas ou centenas de membros.

## What Changes

- Nova seção "Extrair Contatos" no dashboard da popup
- Listagem de todos os grupos do WhatsApp com checkboxes de seleção
- Extração dos participantes de grupos selecionados via WPP.group.getParticipants()
- Geração de CSV com colunas: group_name, phone, is_admin
- Download do arquivo CSV direto no navegador
- Participantes com ID do tipo @lid são ignorados (não são contatos reais)
- Novos handlers no page bridge para GET_GROUPS e GET_PARTICIPANTS

## Capabilities

### New Capabilities

- `group-contact-extraction`: Extração de contatos de grupos do WhatsApp em formato CSV. Lista grupos, permite seleção múltipla, extrai participantes (phone + is_admin) e gera download de CSV.

### Modified Capabilities

<!-- Nenhum capability existente é alterado -->

## Impact

- `public/vendor/chamalead-page-bridge.js`: Novos handlers `CHAMALEAD_PAGE_GET_GROUPS` e `CHAMALEAD_PAGE_GET_PARTICIPANTS`
- `src/extension/content.ts`: Forward das novas mensagens para o page bridge
- `src/features/whatsapp/`: Novo hook `useGroupExtraction.ts` e novo componente `GroupContactExtraction.tsx`
- `src/pages/popup/PopupPage.tsx`: Nova view `group-extraction` no router
- `src/pages/popup/HomeDashboard.tsx`: Novo card "Extrair Contatos"
