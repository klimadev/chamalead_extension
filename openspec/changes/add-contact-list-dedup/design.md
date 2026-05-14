## Context

O `CampaignWizard` (Step 1 - Contatos) permite colar números de telefone ou importar CSV. Os números são armazenados como string separada por vírgula no state `numbers`. Nenhuma verificação de duplicação interna ou de existência de conversa é feita antes do envio.

O hook `useWppChats` já existe e faz polling a cada 5s da lista de chats via page bridge. Atualmente retorna 100 chats, mas nunca é consumido pelo `CampaignWizard`.

A page bridge (`public/vendor/chamalead-page-bridge.js`) executa `wpp.chat.list({ count: 100 })` no mundo MAIN do WhatsApp Web. Aumentar para 500 requer apenas trocar o valor — a API do WPPConnect suporta contagens maiores.

## Goals / Non-Goals

**Goals:**
- Botão manual "Limpar lista" no Passo 1 do CampaignWizard
- Remover números duplicados dentro da própria lista (dedup interno)
- Remover números que já possuem conversa nos últimos 500 chats do WhatsApp
- Feedback visual claro: quantos removidos por duplicação, quantos por chat existente, quantos restam
- Aumentar o limite de chats de 100 para 500 no page bridge e no hook

**Non-Goals:**
- Filtro automático no momento do envio (toggle no Passo 4) — apenas botão manual
- Verificação contra TODOS os chats (limite de 500 por restrição da API)
- Alterar a lógica de envio no `background.ts`
- Persistir preferência de limpeza entre sessões
- Verificação em tempo real (o botão é ação pontual, não contínuo)

## Decisions

### 1. Botão manual em vez de toggle automático

**Escolha:** Botão "Limpar lista" no Passo 1, ação explícita do usuário.

**Alternativa rejeitada:** Toggle "Pular existentes" no Passo 4 com filtro automático no `background.ts`.

**Razão:** O usuário pediu controle manual. O botão é mais simples de implementar e o feedback é imediato — o usuário vê exatamente o que foi removido antes de prosseguir. Um filtro silencioso no background poderia causar confusão ("cadê meus 45 contatos?").

### 2. Reutilizar `useWppChats` hook em vez de fetch ad-hoc

**Escolha:** Importar `useWppChats` no `CampaignWizard` e usar os dados já em cache.

**Alternativa rejeitada:** Fazer uma chamada `chrome.tabs.sendMessage` ad-hoc no clique do botão.

**Razão:** O hook já faz polling a cada 5s. No momento do clique, os dados já estão disponíveis (ou no máximo 5s desatualizados). Evita latência extra e código duplicado. Se o hook retornar lista vazia (WPP não autenticado), o botão aparece desabilitado.

### 3. Limite de 500 chats

**Escolha:** Aumentar `count` de 100 para 500 em `getChats()` no page bridge e no default do hook.

**Alternativa considerada:** Manter 100.

**Razão:** 500 cobre mais terreno sem degradação perceptível. O `WPP.chat.list()` é uma chamada local (dados já em memória no processo do WhatsApp Web), então 500 não tem custo significativo. A resposta via `postMessage` é serializada como JSON — 500 chats (cada um com ~5 campos) resulta em ~50KB, bem dentro do limite seguro de `postMessage`.

### 4. Dedup + chat-check em uma única ação

**Escolha:** Um botão que faz ambas as operações sequencialmente (dedup interno → cross-reference com chats).

**Alternativa rejeitada:** Dois botões separados.

**Razão:** O usuário quer "limpar a lista" — é uma ação única. Separar em dois botões adiciona atrito sem ganho. A ordem importa: dedup primeiro (reduz o Set), depois cross-reference (operação mais "cara" conceitualmente, apesar de ambas serem O(n)).

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| **Cobertura parcial**: apenas 500 chats mais recentes. Números com conversas antigas (fora dos 500) não são detectados. | Label do botão indica "Verifica últimos 500 chats". O texto de resultado também menciona o limite. |
| **Hook não inicializado**: se o WhatsApp Web não estiver autenticado, `useWppChats` retorna lista vazia. O botão faria apenas dedup interno. | Botão desabilitado quando `wppStatus.isAuthenticated === false`, com tooltip "Conecte-se ao WhatsApp Web primeiro". |
| **Chats de grupo misturados**: a lista de chats inclui grupos (`id@g.us`) e newsletters. Se não filtrarmos, poderíamos falsamente remover números que aparecem em grupos. | Filtrar `chats.filter(c => !c.isGroup && !c.isNewsletter)` antes do cross-reference. |
| **Conflito com CSV importado**: se o usuário importar CSV DEPOIS de limpar a lista, os números do CSV são appended ao textarea sem verificação. | A limpeza é uma ação pontual. O usuário pode clicar novamente após importar. |
