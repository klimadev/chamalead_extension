## Why

A extensão ChamaLead sofre de dois problemas que se reforçam: (1) identidade visual fria e genérica (teal clínico), que não comunica energia, urgência ou ação; e (2) sobrecarga cognitiva para novos usuários — o popup muda de forma conforme o site ativo, estados técnicos são expostos em jargão de desenvolvedor, e o formulário de envio em massa despeja 6 seções de uma vez num espaço de 380px. O resultado é uma ferramenta poderosa que parece confusa e inacessível. Um rebrand completo para laranja (quente, ação, produtividade) combinado com simplificações de UX resolve os dois problemas simultaneamente.

## What Changes

- Sistema de cores laranja substitui todos os tokens e hardcodes teal no CSS e componentes. Novas variáveis: `--primary: #f97316`, `--primary-hover: #ea580c`, `--primary-soft: #fff7ed`, `--primary-border: #fed7aa`. Cores de estado (verde/âmbar/vermelho) permanecem inalteradas.
- Badge de contexto do site sempre visível no topo do popup, com labels humanas: "WhatsApp Web", "Instagram", "Outro site". Substitui o bloco de status textual atual por 1-2 linhas escaneáveis.
- Linguagem humana no status do WhatsApp: "WhatsApp aberto" (não "WPP conectado"), "Login confirmado" (não "Sessão autenticada"), "Faça login no WhatsApp" (não "Sessão aguardando autenticação").
- Disclosure progressiva no formulário de envio em massa: contatos e mensagem sempre visíveis; tipo de campanha, segurança, ações, progresso e logs só aparecem quando relevantes ao estado atual (antes/durante/depois do envio).
- Simplificação da UI de áudio: os 4 métodos de conversão (RAW, OGG, WebM, Auto) são processados em background. O usuário vê apenas "Processando áudio..." → "Pronto" com player único. O fallback automático escolhe o melhor método sem expor a complexidade.
- Card de boas-vindas para novos usuários (detectado via `chrome.storage.local`): aparece quando o popup abre em site não-suportado, mostrando as capacidades da extensão e um botão "Abrir WhatsApp Web".
- Botão "Abrir WhatsApp Web" no estado de site não-suportado, que abre o WhatsApp Web em nova aba.
- Ajuste de todos os componentes visuais (botões, links, badges, focus rings, progress bars, logo) para usar os novos tokens laranja.
- O seletor manual de coluna no CSV permanece por garantia; a prévia de números é mantida.

## Capabilities

### New Capabilities

- `orange-brand-system`: Sistema de cores laranja completo — variáveis CSS, tokens semânticos, migração de todos os componentes do teal para o laranja. Gradientes, focus rings, badges de acento, links, barras de progresso.
- `site-aware-ux`: Badge de contexto do site sempre visível, status humano do WhatsApp, botão "Abrir WhatsApp Web" em sites não-suportados, card de boas-vindas para novos usuários.
- `campaign-cockpit-ux`: Disclosure progressiva no BulkSendForm (seções colapsam/expandem conforme estado), simplificação da UI de áudio (codecs invisíveis), reorganização das ações de execução.

### Modified Capabilities

- `popup-module-visual-system`: Estende o sistema visual definido em `refine-popup-module-visuals` com os novos tokens laranja, padrões de disclosure progressiva, card de boas-vindas e badge de contexto de site.

## Impact

- **CSS**: `src/styles/global.css` — substituição de todos os hardcodes teal (#0f766e, #ccfbf1, #f0fdfa, #99f6e4) por tokens laranja; novas variáveis no `:root`; novos padrões de classe para welcome card, site badge, disclosure.
- **Componentes**: `src/ui/Button.tsx`, `src/ui/Switch.tsx`, `src/ui/Card.tsx` — sem mudanças de markup, apenas herdam as novas classes.
- **Páginas**: `src/pages/popup/PopupPage.tsx` — header redesenhado com site badge, welcome card, status humano, botão "Abrir WhatsApp Web".
- **Features**: `src/features/whatsapp/BulkSendForm.tsx` — reorganização das seções com disclosure progressiva; `src/features/instagram/InstagramProfileDetails.tsx` — ajuste de cores nos badges.
- **Nenhuma mudança** em: WA-JS bridge, background service worker, update fetching, CSV parsing, audio conversion pipeline, storage shape, permissões.
