## Tasks

### Phase 1: OGG Muxer + AudioEncoder Pipeline

- [x] Create `src/features/whatsapp/audio-converter.ts` with `convertToOggOpus(sourceBlob: Blob): Promise<ConversionResult>`
- [x] Implement `OggMuxer` class (RFC 7845) — builds valid OGG container pages for Opus packets
- [x] Implement `AudioEncoder` wrapper — configures Opus codec (mono, 48kHz, 16kbps, voip), feeds `AudioData` frames, collects `EncodedAudioChunk` outputs
- [x] Implement format detection `isAlreadyOggOpus(blob: Blob): boolean` for fast path
- [x] Handle errors: `AudioEncoder` not supported, `decodeAudioData` failure, `isConfigSupported` rejection

### Phase 2: UI Integration

- [x] Update `BulkSendForm.tsx` — call `convertToOggOpus()` after file upload, show conversion progress state
- [x] Add conversion loading state: "Convertendo para WhatsApp..." com spinner/indicator
- [x] Add conversion error state: mensagem clara de erro + opção de tentar outro arquivo
- [x] Show "convertido" badge no preview para arquivos que passaram pela conversão
- [x] Fast path: se arquivo já for OGG/Opus, pular conversão e mostrar "pronto" direto

### Phase 3: Bridge MIME Enforcement

- [x] Update `sendAudio()` in `public/vendor/chamalead-page-bridge.js` — always ensure `data:audio/ogg;codecs=opus` MIME
- [x] Add `mimetype: 'audio/ogg; codecs=opus'` option explicitly in `sendFileMessage` call

### Phase 4: Validation

- [x] Test with MP3 file → deve converter e enviar como voice note funcional
- [x] Test with WAV file → deve converter e enviar como voice note funcional
- [x] Test with OGG/Opus file → deve usar fast path e enviar direto
- [x] Test with arquivo corrompido → deve mostrar erro amigável
- [x] Run `npm run build` to validate
