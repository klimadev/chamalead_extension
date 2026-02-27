# ChamaLead Extension Boilerplate

Base moderna para extensao Chrome/Edge/Brave/Opera com React + TypeScript + Vite, preparada para crescer com organizacao simples.

## Stack

- React 19 + TypeScript
- Vite 7
- `@crxjs/vite-plugin` (Manifest V3)
- ESLint 9
- `webextension-polyfill` para API padronizada

## Estrutura

```txt
src/
  app/
    popup/        # composicao da UI do popup
    options/      # composicao da pagina de opcoes
  components/
    ui/           # componentes base reutilizaveis
  extension/      # background + content scripts
  features/       # modulos de negocio por feature
  options/        # entrypoint da pagina de opcoes
  popup/          # entrypoint do popup
  shared/         # hooks, tipos e libs comuns
  styles/         # estilos globais
```

## Scripts

- `npm run dev`: desenvolvimento da extensao
- `npm run lint`: lint do projeto
- `npm run typecheck`: checagem de tipos
- `npm run build`: build de producao da extensao

## Como carregar no navegador

1. Rode `npm run build`
2. Abra `chrome://extensions`
3. Ative modo desenvolvedor
4. Clique em "Load unpacked" e selecione `dist/`

## Proximo passo recomendado

Criar uma feature por pasta em `src/features` e conectar com os scripts de `background`/`content` usando mensagens tipadas.
