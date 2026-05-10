## Why

O envio de áudio como voice note (PTT) no WhatsApp falha com "áudio não disponível" quando o arquivo não está no formato exigido pelo WhatsApp: **OGG container + Opus codec (mono, 16-48kHz)**. Atualmente qualquer formato é aceito no upload (MP3, WAV, AAC, etc.) e enviado como-is, resultando em mensagens não reproduzíveis.

## What Changes

- Adicionar pipeline de conversão client-side: arquivo fonte → decode (Web Audio API) → encode Opus (WebCodecs `AudioEncoder`) → OGG container muxer → `data:audio/ogg;codecs=opus;base64,...`
- Implementar OGG container muxer minimal (~150 linhas JS) compatível com RFC 7845 (Opus in Ogg)
- Detectar formato de entrada: se já for OGG/Opus, pular conversão e enviar direto
- Atualizar o bridge (`chamalead-page-bridge.js`) para sempre forçar MIME `audio/ogg; codecs=opus` em envios de áudio PTT
- Adicionar indicador visual de conversão no popup enquanto o áudio é processado

## Capabilities

### Modified Capabilities
- `whatsapp-bulk-send`: Pipeline de envio de áudio agora converte para OGG/Opus antes do envio

## Impact

- Afeta: `BulkSendForm.tsx` (upload + indicador de conversão), novo módulo `audio-converter.ts` em `src/features/whatsapp/`, bridge `chamalead-page-bridge.js` (MIME type enforcement)
- Zero dependências npm externas — usa `AudioContext.decodeAudioData()`, `OfflineAudioContext`, `AudioEncoder` (WebCodecs, Chrome 94+), e OGG muxer próprio
- Áudio já em OGG/Opus passa direto (fast path), sem penalidade
- Conversão é assíncrona e não bloqueia a UI; tempo de conversão é proporcional ao tamanho do arquivo (não real-time)
