## Why

Usuários frequentemente colam listas de telefones que contêm números repetidos ou que já possuem conversa ativa no WhatsApp. Enviar mensagens para esses contatos gera spam report, prejudica a reputação do número e reduz a efetividade da campanha. Não existe hoje nenhuma verificação pré-envio.

## What Changes

- **Novo botão "Limpar lista"** no Passo 1 (Contatos) do CampaignWizard, que verifica a lista contra chats existentes e remove duplicados internos
- **Aumento do limite de chats** de 100 para 500 no page bridge e no hook `useWppChats`, ampliando a cobertura da verificação
- **Dedup interno**: remoção de números repetidos dentro da própria lista (ex: mesmo DDD+telefone colado duas vezes)
- **Cross-reference com chats**: remoção de números que já possuem conversa no WhatsApp (últimos 500 chats)
- **Feedback visual**: após a limpeza, o usuário vê quantos foram removidos por duplicação, quantos por chat existente e quantos restam

## Capabilities

### New Capabilities

- `contact-list-dedup`: Verificação e limpeza de lista de contatos — remove duplicados internos e números que já possuem conversa ativa no WhatsApp, com feedback visual para o usuário.

### Modified Capabilities

<!-- Nenhuma capability existente tem seus requisitos alterados -->

## Impact

- `public/vendor/chamalead-page-bridge.js`: alterar `count: 100` → `count: 500` em `getChats()`
- `src/features/whatsapp/useWppChats.ts`: atualizar `limitedTo` default de 100 para 500
- `src/features/whatsapp/CampaignWizard.tsx`: importar `useWppChats`, adicionar botão e lógica de limpeza, novo state para feedback
- Nenhuma API nova. Nenhuma dependência nova. Operação 100% client-side.
