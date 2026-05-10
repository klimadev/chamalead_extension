## whatsapp-audio-ptt

### Requirements

- Audio files uploaded for WhatsApp PTT (voice note) bulk send MUST be converted to OGG container with Opus codec before sending, UNLESS already in that format.
- Conversion MUST use browser-native APIs only (Web Audio API + WebCodecs AudioEncoder) with zero external npm dependencies.
- The OGG container output MUST conform to RFC 7845 (Opus in Ogg).
- Encoder configuration: mono, 48kHz sample rate, 16kbps bitrate, `voip` application, 20ms frame duration.
- Files already in OGG/Opus format MUST use a fast path (no re-encoding).

### Behavior

- When a non-OGG/Opus audio file is uploaded, the UI SHALL show a conversion indicator ("Convertendo...").
- When conversion completes, the UI SHALL show the converted file ready for preview and send.
- When conversion fails, the UI SHALL show a clear error message with "tente outro formato".
- When the browser does not support `AudioEncoder`, the UI SHALL show an error explaining the requirement.
- The page bridge SHALL force the MIME type to `audio/ogg; codecs=opus` for all audio PTT sends, regardless of the source data URL MIME.

### Constraints

- Max file size: 5MB (existing constraint, unchanged).
- Supported source formats: any format decodable by `AudioContext.decodeAudioData()` (MP3, WAV, AAC, OGG/Vorbis, FLAC, etc.).
- Chrome 94+ required for `AudioEncoder` WebCodecs API.
