## ADDED Requirements

### Requirement: Botão "Limpar lista" no Passo 1

O sistema DEVE exibir um botão "Limpar lista" no Passo 1 (Contatos) do CampaignWizard quando houver números adicionados e o WhatsApp Web estiver autenticado.

#### Scenario: Botão visível com contatos e WPP autenticado

- **WHEN** o usuário está no Passo 1 com `contactCount > 0` E `wppStatus.isAuthenticated === true`
- **THEN** o botão "Limpar lista" é exibido abaixo do contador de números

#### Scenario: Botão oculto sem WPP autenticado

- **WHEN** o usuário está no Passo 1 mas `wppStatus.isAuthenticated === false`
- **THEN** o botão "Limpar lista" NÃO é exibido

#### Scenario: Botão oculto sem contatos

- **WHEN** o usuário está no Passo 1 mas `contactCount === 0`
- **THEN** o botão "Limpar lista" NÃO é exibido

### Requirement: Remoção de duplicados internos

Ao clicar em "Limpar lista", o sistema DEVE remover números de telefone duplicados da lista, mantendo apenas a primeira ocorrência de cada número formatado.

#### Scenario: Lista com números repetidos

- **WHEN** o textarea contém "5511999999999, 5511888888888, 5511999999999"
- **THEN** após a limpeza o textarea contém "5511999999999, 5511888888888"
- **THEN** o feedback indica "1 duplicado removido"

#### Scenario: Lista sem números repetidos

- **WHEN** o textarea contém "5511999999999, 5511888888888" (sem duplicados)
- **THEN** o feedback indica "0 duplicados removidos"

#### Scenario: Números com formatação diferente mas mesmo DDD+telefone

- **WHEN** o textarea contém "55 11 99999-9999, 5511999999999"
- **THEN** após `formatPhoneNumber`, ambos viram "5511999999999"
- **THEN** apenas um é mantido e o feedback indica "1 duplicado removido"

### Requirement: Remoção de números com conversa existente

Ao clicar em "Limpar lista", o sistema DEVE remover números que correspondam a chats existentes nos últimos 500 chats do WhatsApp, excluindo grupos e newsletters.

#### Scenario: Número com conversa existente

- **WHEN** a lista de chats contém `{ id: "5511999999999@c.us", isGroup: false, isNewsletter: false }`
- **THEN** o número "5511999999999" é removido da lista
- **THEN** o feedback indica "1 removido (já possui conversa)"

#### Scenario: Número sem conversa existente

- **WHEN** a lista de chats NÃO contém "5511888888888@c.us"
- **THEN** o número "5511888888888" permanece na lista

#### Scenario: Número presente apenas em grupo

- **WHEN** a lista de chats contém `{ id: "5511999999999-123456@g.us", isGroup: true }`
- **THEN** o número "5511999999999" NÃO é removido (pois o chat é de grupo, não individual)

#### Scenario: Número presente em newsletter

- **WHEN** a lista de chats contém `{ id: "5511999999999@newsletter", isNewsletter: true }`
- **THEN** o número "5511999999999" NÃO é removido

### Requirement: Feedback visual após limpeza

Após a operação de limpeza, o sistema DEVE exibir um resumo com as contagens de remoções e números restantes.

#### Scenario: Limpeza com remoções de ambos os tipos

- **WHEN** a limpeza remove 12 duplicados e 45 por chat existente, restando 173
- **THEN** é exibido: "12 duplicados removidos, 45 já possuem conversa (últimos 500 chats), 173 prontos para envio"

#### Scenario: Limpeza sem remoções

- **WHEN** a limpeza não remove nenhum número
- **THEN** é exibido: "Nenhum número removido. Lista já está limpa."

#### Scenario: Lista fica vazia após limpeza

- **WHEN** todos os números são removidos
- **THEN** é exibido: "Todos os números foram removidos. A lista está vazia."
- **THEN** o contador de números mostra 0

### Requirement: Chat list com limite de 500

O page bridge DEVE solicitar 500 chats ao invés de 100 ao WPPConnect. O hook `useWppChats` DEVE usar 500 como `limitedTo` default.

#### Scenario: Page bridge solicita 500 chats

- **WHEN** o content script envia `CHAMALEAD_GET_WPP_CHATS`
- **THEN** o page bridge chama `wpp.chat.list({ count: 500 })`

#### Scenario: Hook reporta limite de 500

- **WHEN** `useWppChats` recebe resposta da page bridge
- **THEN** `limitedTo` no estado é 500 (quando não sobrescrito pela resposta)

### Requirement: Formatação consistente de números

A comparação entre números da lista e chats DEVE usar o mesmo algoritmo de formatação (`formatPhoneNumber`) para garantir matching correto.

#### Scenario: Número formatado consistentemente

- **WHEN** o textarea contém "55 11 99999-9999" E o chat ID é "5511999999999@c.us"
- **THEN** `formatPhoneNumber("55 11 99999-9999")` resulta em "5511999999999"
- **THEN** strip de `@c.us` resulta em "5511999999999"
- **THEN** o match é encontrado e o número é removido
