## Design: Audio OGG/Opus Conversion Pipeline

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BulkSendForm.tsx                             │
│  ┌──────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │ <input   │────▶│ handleAudioUpload│────▶│ converter UI     │    │
│  │ audio/*  │     │ (FileReader)     │     │ "Convertendo..." │    │
│  └──────────┘     └──────┬───────────┘     └──────────────────┘    │
│                          │                                         │
│                          │ Blob + filename                         │
│                          ▼                                         │
│               ┌─────────────────────┐                              │
│               │  audio-converter.ts │    NOVO MÓDULO               │
│               │                     │                              │
│               │  convertToOggOpus() │                              │
│               │                     │                              │
│               │  1. detecta formato │                              │
│               │  2. fast-path OGG?  │──▶ retorna direto            │
│               │  3. decodeAudioData │                              │
│               │  4. AudioEncoder    │                              │
│               │  5. OGG muxer       │                              │
│               │  6. → Blob .ogg     │                              │
│               └────────┬────────────┘                              │
│                        │                                           │
│                        ▼                                           │
│               ┌─────────────────────┐                              │
│               │  data:audio/ogg;    │                              │
│               │  codecs=opus;base64 │──▶ useBulkSend → background  │
│               └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘

                          ...existing flow...

┌─────────────────────────────────────────────────────────────────────┐
│                   chamalead-page-bridge.js                          │
│                                                                     │
│  sendAudio():                                                       │
│    let mediaData = audioBase64                                      │
│    // ⚠ CORREÇÃO: sempre forçar MIME OGG/Opus para PTT            │
│    if (!mediaData.includes('audio/ogg')) {                          │
│      const b64 = mediaData.split(',')[1] || mediaData               │
│      mediaData = `data:audio/ogg;codecs=opus;base64,${b64}`        │
│    }                                                                │
│                                                                     │
│    await WPP.chat.sendFileMessage(chatId, mediaData, {              │
│      type: 'audio',                                                 │
│      isPtt: true,                                                   │
│      waveform: true,                                                │
│      mimetype: 'audio/ogg; codecs=opus'                             │
│    })                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### AudioConverter Pipeline

```typescript
// src/features/whatsapp/audio-converter.ts

interface ConversionResult {
  blob: Blob           // OGG/Opus blob
  dataUrl: string      // data:audio/ogg;codecs=opus;base64,...
  wasConverted: boolean // false = já era OGG, fast path
}

async function convertToOggOpus(sourceBlob: Blob): Promise<ConversionResult>

// Internal pipeline:
// 1. sourceBlob.arrayBuffer()
// 2. AudioContext.decodeAudioData() → AudioBuffer (PCM)
// 3. Extract Float32Array channel data
// 4. AudioEncoder (Opus) — feed AudioData frames
// 5. Collect EncodedAudioChunk outputs
// 6. OggMuxer.build(opusPackets) → Uint8Array (.ogg bytes)
// 7. new Blob([oggBytes], { type: 'audio/ogg; codecs=opus' })
// 8. FileReader.readAsDataURL() → data URL string
```

### OggMuxer (RFC 7845)

Ogg container para Opus consiste em:

```
┌─────────────────────────────────────┐
│ Ogg Page 1: OpusHead               │
│  - "OpusHead" (8 bytes)            │
│  - version (1), channels (1), ...  │
│  - pre-skip (2), sample_rate (4)   │
│  - output_gain (2), channel_map(1) │
├─────────────────────────────────────┤
│ Ogg Page 2: OpusTags               │
│  - "OpusTags" (8 bytes)            │
│  - vendor_string                   │
│  - user_comment_list_length        │
│  - (empty comments)                │
├─────────────────────────────────────┤
│ Ogg Page 3..N: Audio Packets       │
│  - Each page contains Opus packet  │
│  - Granule position = accumulated  │
│    samples (48kHz * frames)        │
└─────────────────────────────────────┘
```

Parâmetros fixos do encoder:
- Codec: `opus`
- Sample rate: 48000 Hz
- Channels: 1 (mono)
- Bitrate: 16000 bps (voice quality, suficiente para PTT)
- Frame duration: 20ms (960 samples @ 48kHz)
- Application: `voip` (otimizado para voz)

### Detecção de Fast Path

```typescript
function isAlreadyOggOpus(blob: Blob): boolean {
  // Verifica magic bytes "OggS" (0x4F676753)
  // E se o MIME type é audio/ogg ou audio/opus
  return blob.type === 'audio/ogg' 
      || blob.type === 'audio/opus'
      || blob.type.includes('ogg')
}
```

### UX States

```
┌──────────────────────────────────────────┐
│  Áudio (PTT)                             │
│                                          │
│  [Sem arquivo]                           │
│  ┌──────────────────────────────────┐    │
│  │ 📁 Escolher arquivo de áudio    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [Arquivo selecionado, convertendo]      │
│  ┌──────────────────────────────────┐    │
│  │ ⟳  Convertendo para WhatsApp... │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [Convertido, pronto para envio]         │
│  ┌──────────────────────────────────┐    │
│  │ ✅ audio.ogg  (convertido)       │    │
│  │ [▶═══════ player ═══════]        │    │
│  │ [Remover]                        │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [Erro na conversão]                     │
│  ┌──────────────────────────────────┐    │
│  │ ⚠ Falha na conversão do áudio   │    │
│  │ Tente um arquivo em outro formato│    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### Tratamento de Erros

| Erro | Causa | Ação |
|------|-------|------|
| `AudioEncoder` não suportado | Chrome < 94 | Mostrar erro claro, sugerir atualizar navegador |
| `decodeAudioData` falha | Arquivo corrompido | "Arquivo de áudio inválido ou corrompido" |
| Arquivo > 5MB | Limite de upload | Já tratado no `handleAudioUpload` |
| `isConfigSupported` retorna false | Codec não disponível | Fallback: avisar que formato não é suportado |

### Files Changed

| File | Change |
|------|--------|
| `src/features/whatsapp/audio-converter.ts` | **NEW** — pipeline de conversão + OGG muxer |
| `src/features/whatsapp/BulkSendForm.tsx` | Integrar `convertToOggOpus()` no upload, estados de loading/erro, fast-path detection |
| `public/vendor/chamalead-page-bridge.js` | Forçar MIME `audio/ogg; codecs=opus` sempre no `sendAudio()` |
| `src/features/whatsapp/useBulkSend.ts` | Adaptar `startBulkSendAudio` para receber já convertido |

### Dependency Implications

- **Zero novas dependências npm** — usa APIs nativas do Chrome
- `AudioEncoder` requer Chrome 94+ (lançado em set/2021) — compatível com todos os targets da extensão
- OGG muxer é implementado como ~150 linhas de JS puro no módulo `audio-converter.ts`
