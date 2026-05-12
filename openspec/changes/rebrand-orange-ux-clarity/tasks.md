## 1. Sistema de cores laranja — CSS tokens

- [x] 1.1 Adicionar novas variáveis CSS laranja no `:root` de `src/styles/global.css`: `--primary`, `--primary-hover`, `--primary-soft`, `--primary-border`, `--primary-gradient`, `--progress-gradient`
- [x] 1.2 Substituir todos os hardcodes teal em `.button--soft` por `var(--primary)`
- [x] 1.3 Substituir hardcodes teal em `.instagram-profile-badge--accent`, `.instagram-profile-link` por tokens laranja
- [x] 1.4 Substituir `.field-input:focus` border-color e box-shadow teal por laranja
- [x] 1.5 Substituir `.progress-fill` gradient teal→green por `var(--progress-gradient)`
- [x] 1.6 Substituir `.about-logo` gradient teal→green por `var(--primary-gradient)`
- [x] 1.7 Substituir `.contact-tag` e `.update-btn.download` cores teal por tokens laranja
- [x] 1.8 Substituir `.status-badge.authenticated` e demais referências residuais a teal
- [x] 1.9 Rodar `npm run build` para validar que o CSS compila sem erros

## 2. Header redesenhado — site badge e status humano

- [x] 2.1 Refatorar `WhatsAppStatusPanel` em `src/pages/popup/PopupPage.tsx` com labels humanos (WhatsApp aberto, Login confirmado, Pronto pra disparar, Faça login, etc.)
- [x] 2.2 Reduzir status chips do WhatsApp de 4 tiers para 3 (Pronto, Aguardando login, Indisponível) + loading (Verificando)
- [x] 2.3 Criar componente `SiteContextBadge` que mostra "📍 WhatsApp Web", "📍 Instagram" ou "📍 hostname" com chip de status correspondente
- [x] 2.4 Separar header em duas seções: linha de identidade (ChamaLead + versão) e linha de contexto (site badge + status)
- [x] 2.5 Adicionar botão "Abrir WhatsApp Web" no estado de site não-suportado, abrindo `https://web.whatsapp.com` via `chrome.tabs.create` em nova aba
- [x] 2.6 Atualizar `SiteUnavailableCard`, `SiteLoadingCard`, e estado Instagram para usarem o novo padrão de site badge
- [x] 2.7 Rodar `npm run build`

## 3. Card de boas-vindas para novos usuários

- [x] 3.1 Adicionar verificação de `chamalead_onboarded` via `chrome.storage.local` no `PopupPage`
- [x] 3.2 Criar componente `WelcomeCard` com identidade ChamaLead, descrição, lista de capacidades e botão "Abrir WhatsApp Web"
- [x] 3.3 Exibir `WelcomeCard` quando `chamalead_onboarded` está ausente (independente do site ativo)
- [x] 3.4 Setar `chamalead_onboarded = true` no `chrome.storage.local` após usuário clicar no botão ou o card ser dispensado
- [x] 3.5 Garantir que o welcome card não aparece para usuários que já têm a chave
- [x] 3.6 Rodar `npm run build`

## 4. Disclosure progressiva no BulkSendForm

- [x] 4.1 Adicionar estado `showContactSection` e `showMessageSection` controlados por `progress.status` no `BulkSendForm`
- [x] 4.2 No estado idle: mostrar contatos e mensagem expandidos; esconder ou colapsar progresso, logs, e seção de segurança como linha compacta
- [x] 4.3 No estado sending: colapsar contatos e mensagem (resumo: "12 números", "Mensagem de texto"), expandir barra de progresso e ações (pausar/cancelar)
- [x] 4.4 No estado paused: manter progresso visível no ponto de pausa, mostrar botões retomar/cancelar
- [x] 4.5 No estado completed: mostrar mensagem de conclusão, contagem final, botões "Ver logs" e "Nova campanha"
- [x] 4.6 Mover seção "Segurança" para um bloco colapsável (`<details>`) sempre acessível mas não dominante
- [x] 4.7 Garantir que a área de ações (Iniciar/Pausar/Cancelar) nunca sai da viewport durante o envio
- [x] 4.8 Rodar `npm run build`

## 5. Simplificação da UI de áudio

- [x] 5.1 Criar novo componente `AudioUploadSection` que substitui os 4 cards de codec individuais
- [x] 5.2 Estado "upload": mostrar input de arquivo e label "Áudio PTT"
- [x] 5.3 Estado "processing": mostrar spinner + "Processando áudio..." + nome do arquivo (enquanto `isLoading` for true)
- [x] 5.4 Estado "ready": lógica de auto-seleção — tentar `auto`, fallback para `ogg`, `webm`, `raw`; mostrar player único com nome do arquivo e duração
- [x] 5.5 Estado "error": mostrar mensagem amigável "Não foi possível processar o áudio. Tente outro arquivo."
- [x] 5.6 Adicionar botões "Trocar" (volta ao upload) e "Remover" (reseta estado) no estado ready
- [x] 5.7 Manter o pipeline de conversão paralela inalterado nos handlers existentes
- [x] 5.8 Remover os 4 cards de codec individuais do JSX (a lógica de `audioMethods` permanece no estado)
- [x] 5.9 Rodar `npm run build`

## 6. Alinhamento final — Instagram, Updates, About, Options

- [x] 6.1 Verificar `InstagramProfileDetails.tsx` — badges e links usam novos tokens laranja
- [x] 6.2 Verificar `UpdatesTab.tsx` — botões de update usam tokens laranja; estado visual consistente
- [x] 6.3 Verificar `PopupPage.tsx` About tab — logo usa gradiente laranja, cores de texto consistentes
- [x] 6.4 Verificar `SettingsForm.tsx` e `OptionsPage.tsx` — cores de foco e acentos alinhadas com laranja
- [x] 6.5 Ajustar `Switch.tsx` accent-color para `var(--primary)` se necessário
- [x] 6.6 Rodar `npm run lint && npm run build`

## 7. Versionamento e deploy

- [x] 7.1 Incrementar versão em `package.json` (minor — 0.2.0)
- [x] 7.2 Incrementar `VERSION` em `vite.config.ts` (minor — 0.2.0)
- [x] 7.3 Rodar `npm run build` final para validar versão
