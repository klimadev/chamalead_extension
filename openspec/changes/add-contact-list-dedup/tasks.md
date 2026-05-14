## 1. Aumentar limite de chats

- [x] 1.1 Alterar `count: 100` → `count: 500` em `getChats()` no `public/vendor/chamalead-page-bridge.js`
- [x] 1.2 Alterar `limitedTo: 100` → `limitedTo: 500` nos defaults de `useWppChats.ts`

## 2. Integrar useWppChats no CampaignWizard

- [x] 2.1 Importar `useWppChats` e `WppChat` no `CampaignWizard.tsx`
- [x] 2.2 Chamar o hook `useWppChats(wppStatus)` e desestruturar `chats`
- [x] 2.3 Adicionar state `cleanResult` para feedback da limpeza (`{ dupesRemoved, chatRemoved, remaining } | null`)
- [x] 3.1 Implementar `handleCleanList()`: parse da lista → formatPhoneNumber → dedup com Set → cross-reference com chats (filtrando grupos/newsletters) → atualizar `numbers` e `cleanResult`
- [x] 4.1 Adicionar botão "Limpar lista" no Passo 1, abaixo do contador de números, visível apenas com `wppStatus.isAuthenticated && contactCount > 0`
- [x] 4.2 Adicionar bloco de feedback visual após a limpeza, exibindo `cleanResult` com contagens de duplicados removidos, chats existentes e restantes
- [x] 4.3 Limpar `cleanResult` quando o textarea de números for alterado manualmente

## 5. Validação

- [x] 5.1 Rodar `npm run lint` e corrigir erros
- [x] 5.2 Rodar `npm run build` e garantir que compila sem erros
- [x] 5.3 Incrementar versão em `package.json` e `vite.config.ts` (patch)
