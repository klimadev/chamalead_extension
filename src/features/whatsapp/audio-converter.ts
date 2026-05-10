// OGG CRC32 lookup table (polynomial 0x04C11DB7, reflected)
const CRC32_TABLE = new Uint32Array(256);
(() => {
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xEDB88320 ^ (crc >>> 1) : crc >>> 1
    }
    CRC32_TABLE[i] = crc
  }
})()

function oggCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const OGG_MAGIC = new Uint8Array([0x4F, 0x67, 0x67, 0x53])
const OGG_SERIAL = 0x12345678
const OPUS_SAMPLE_RATE = 48000

function buildOggPage(
  packet: Uint8Array,
  pageSeq: number,
  granulePos: number,
  headerType: number,
): Uint8Array {
  const segments = Math.ceil(packet.length / 255) || 1
  const needsTerminator = packet.length > 0 && packet.length % 255 === 0
  const totalSegments = segments + (needsTerminator ? 1 : 0)
  const headerSize = 27 + totalSegments
  const totalSize = headerSize + packet.length
  const buf = new Uint8Array(totalSize)
  const view = new DataView(buf.buffer)

  // Magic: "OggS"
  buf.set(OGG_MAGIC, 0)

  // Version: 0
  buf[4] = 0

  // Header type flags
  buf[5] = headerType

  // Granule position (8 bytes LE)
  view.setBigInt64(6, BigInt(granulePos), true)

  // Bitstream serial number (4 bytes LE)
  view.setUint32(14, OGG_SERIAL, true)

  // Page sequence number (4 bytes LE)
  view.setUint32(18, pageSeq, true)

  // CRC32 placeholder (4 bytes, computed below)
  view.setUint32(22, 0, true)

  // Number of page segments (1 byte)
  buf[26] = totalSegments

  // Segment table: split packet into 255-byte segments
  const tableOffset = 27
  for (let i = 0; i < segments; i++) {
    const size = Math.min(255, packet.length - i * 255)
    buf[tableOffset + i] = size
  }
  if (needsTerminator) {
    buf[tableOffset + segments] = 0
  }

  // Data
  const dataOffset = tableOffset + totalSegments
  buf.set(packet, dataOffset)

  // Compute and set CRC32 (over entire page, with CRC field zeroed)
  const crc = oggCrc32(buf)
  view.setUint32(22, crc, true)

  return buf
}

function buildOpusHead(pageSeq: number): Uint8Array {
  const head = new Uint8Array(19)
  const view = new DataView(head.buffer)
  const te = new TextEncoder()

  te.encodeInto('OpusHead', head)

  view.setUint8(8, 1)     // version
  view.setUint8(9, 1)     // channels = 1 (mono)
  view.setUint16(10, 312, true)   // pre-skip
  view.setUint32(12, OPUS_SAMPLE_RATE, true) // input sample rate
  view.setUint16(16, 0, true)    // output gain
  view.setUint8(18, 0)    // mapping family = 0

  // Header type: BOS (beginning of stream) = 0x02
  return buildOggPage(head, pageSeq, 0, 0x02)
}

function buildOpusTags(pageSeq: number): Uint8Array {
  const vendor = 'ChamaLead'
  const vendorBytes = new TextEncoder().encode(vendor)
  const tags = new Uint8Array(8 + 4 + vendorBytes.length + 4)
  const view = new DataView(tags.buffer)
  const te = new TextEncoder()

  te.encodeInto('OpusTags', tags)

  view.setUint32(8, vendorBytes.length, true)
  tags.set(vendorBytes, 12)

  // user_comment_list_length = 0
  view.setUint32(12 + vendorBytes.length, 0, true)

  return buildOggPage(tags, pageSeq, 0, 0x00)
}

function buildAudioPages(
  opusPackets: Uint8Array[],
  startPageSeq: number,
  frameSamples: number,
): Uint8Array[] {
  let granule = 0
  return opusPackets.map((packet, i) => {
    granule += frameSamples
    const flags = i === opusPackets.length - 1 ? 0x04 : 0x00
    return buildOggPage(packet, startPageSeq + i, granule, flags)
  })
}

function buildOggFile(opusPackets: Uint8Array[], frameSamples: number): Uint8Array {
  const pages: Uint8Array[] = []

  // Page 0: OpusHead (BOS)
  pages.push(buildOpusHead(0))

  // Page 1: OpusTags
  pages.push(buildOpusTags(1))

  // Pages 2..N: Audio data
  const audioPages = buildAudioPages(opusPackets, 2, frameSamples)
  pages.push(...audioPages)

  // EOS on last page
  if (pages.length > 0) {
    const last = pages[pages.length - 1]
    last[5] |= 0x04 // set EOS flag
    const crc = oggCrc32(last)
    new DataView(last.buffer).setUint32(22, crc, true)
  }

  // Compute total size
  const totalSize = pages.reduce((sum, p) => sum + p.length, 0)
  const result = new Uint8Array(totalSize)
  let offset = 0
  for (const page of pages) {
    result.set(page, offset)
    offset += page.length
  }

  return result
}

function encodePcmToOpus(audioBuffer: AudioBuffer, onPacket: (packet: Uint8Array) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const channelData = audioBuffer.getChannelData(0)
    const totalSamples = channelData.length
    const frameSize = 960 // 20ms @ 48kHz

    const encoder = new AudioEncoder({
      output: (chunk: EncodedAudioChunk) => {
        const data = new Uint8Array(chunk.byteLength)
        chunk.copyTo(data)
        onPacket(data)
      },
      error: (err: DOMException) => {
        reject(new Error(`AudioEncoder error: ${err.message}`))
      },
    })

    const config: AudioEncoderConfig = {
      codec: 'opus',
      sampleRate: OPUS_SAMPLE_RATE,
      numberOfChannels: 1,
      bitrate: 16000,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(config as any).opus = {
      application: 'voip',
      frameDuration: 20000,
    }

    encoder.configure(config)

    let timestamp = 0
    for (let offset = 0; offset < totalSamples; offset += frameSize) {
      const remaining = totalSamples - offset
      const frameLen = Math.min(frameSize, remaining)
      const frame = new Float32Array(frameSize)

      if (frameLen < frameSize) {
        // Pad last frame with zeros
        frame.set(channelData.subarray(offset, offset + frameLen), 0)
      } else {
        frame.set(channelData.subarray(offset, offset + frameSize), 0)
      }

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: OPUS_SAMPLE_RATE,
        numberOfFrames: frameSize,
        numberOfChannels: 1,
        timestamp,
        data: frame,
      })

      encoder.encode(audioData)
      audioData.close()
      timestamp += frameSize * 1_000_000 / OPUS_SAMPLE_RATE
    }

    void encoder.flush().then(() => {
      encoder.close()
      resolve()
    }).catch(reject)
  })
}

export interface ConversionResult {
  blob: Blob
  dataUrl: string
  wasConverted: boolean
}

export function isAlreadyOggOpus(blob: Blob): boolean {
  if (blob.type === 'audio/ogg' || blob.type === 'audio/opus' || blob.type.includes('ogg')) {
    return true
  }
  return false
}

export class AudioConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AudioConversionError'
  }
}

async function checkBrowserSupport(): Promise<void> {
  if (typeof AudioEncoder === 'undefined') {
    throw new AudioConversionError('Seu navegador não suporta conversão de áudio. Use Chrome 94 ou superior.')
  }

  const support = await AudioEncoder.isConfigSupported({
    codec: 'opus',
    sampleRate: OPUS_SAMPLE_RATE,
    numberOfChannels: 1,
    bitrate: 16000,
  })

  if (!support.supported) {
    throw new AudioConversionError('Codec Opus não está disponível neste navegador.')
  }
}

export async function convertToOggOpus(sourceBlob: Blob): Promise<ConversionResult> {
  // Fast path: already OGG/Opus
  if (isAlreadyOggOpus(sourceBlob)) {
    const dataUrl = await blobToDataUrl(sourceBlob)
    return { blob: sourceBlob, dataUrl, wasConverted: false }
  }

  // Phase 1: Decode source audio
  let arrayBuffer: ArrayBuffer
  try {
    arrayBuffer = await sourceBlob.arrayBuffer()
  } catch {
    throw new AudioConversionError('Não foi possível ler o arquivo de áudio.')
  }

  const audioCtx = new AudioContext()
  let sourceBuffer: AudioBuffer
  try {
    sourceBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0))
  } catch {
    void audioCtx.close()
    throw new AudioConversionError('Arquivo de áudio inválido ou corrompido. Tente outro formato.')
  }

  // Phase 2: Resample to 48kHz mono via OfflineAudioContext
  const resampledLength = Math.ceil(sourceBuffer.duration * OPUS_SAMPLE_RATE)
  const offlineCtx = new OfflineAudioContext(1, resampledLength, OPUS_SAMPLE_RATE)
  const sourceNode = offlineCtx.createBufferSource()
  sourceNode.buffer = sourceBuffer
  sourceNode.connect(offlineCtx.destination)
  sourceNode.start(0)

  let resampledBuffer: AudioBuffer
  try {
    resampledBuffer = await offlineCtx.startRendering()
  } catch {
    void audioCtx.close()
    throw new AudioConversionError('Falha ao processar o áudio. Tente outro arquivo.')
  }

  void audioCtx.close()

  // Phase 3: Check browser support for AudioEncoder
  await checkBrowserSupport()

  // Phase 4: Encode PCM to Opus packets
  const opusPackets: Uint8Array[] = []
  try {
    await encodePcmToOpus(resampledBuffer, (packet) => {
      opusPackets.push(packet)
    })
  } catch (error) {
    throw new AudioConversionError(
      error instanceof Error ? `Falha na codificação: ${error.message}` : 'Falha na codificação do áudio.',
    )
  }

  if (opusPackets.length === 0) {
    throw new AudioConversionError('O áudio resultou em zero pacotes após codificação.')
  }

  // Phase 5: Build OGG container
  const frameSamples = 960
  const oggBytes = buildOggFile(opusPackets, frameSamples)

  // Phase 6: Create blob and data URL
  const oggBlob = new Blob([new Uint8Array(oggBytes)], { type: 'audio/ogg; codecs=opus' })
  const dataUrl = await blobToDataUrl(oggBlob)

  return { blob: oggBlob, dataUrl, wasConverted: true }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new AudioConversionError('Falha ao converter blob para data URL.'))
      }
    }
    reader.onerror = () => reject(new AudioConversionError('Erro ao ler arquivo convertido.'))
    reader.readAsDataURL(blob)
  })
}
