import Recorder from 'opus-recorder'
import encoderWorkerPath from 'opus-recorder/dist/encoderWorker.min.js?url'

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

export async function convertToOggOpus(sourceBlob: Blob): Promise<ConversionResult> {
  if (isAlreadyOggOpus(sourceBlob)) {
    const dataUrl = await blobToDataUrl(sourceBlob)
    return { blob: sourceBlob, dataUrl, wasConverted: false }
  }

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

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(sourceBuffer.duration * 16000),
    16000,
  )
  const offlineSource = offlineCtx.createBufferSource()
  offlineSource.buffer = sourceBuffer
  offlineSource.connect(offlineCtx.destination)
  offlineSource.start(0)

  let resampledBuffer: AudioBuffer
  try {
    resampledBuffer = await offlineCtx.startRendering()
  } catch {
    void audioCtx.close()
    throw new AudioConversionError('Falha ao processar o áudio. Tente outro arquivo.')
  }

  const bufferSource = audioCtx.createBufferSource()
  bufferSource.buffer = resampledBuffer
  const dest = audioCtx.createMediaStreamDestination()
  bufferSource.connect(dest)
  const sourceNode = audioCtx.createMediaStreamSource(dest.stream)

  let oggOpusBlob: Blob
  try {
    oggOpusBlob = await new Promise<Blob>((resolve, reject) => {
      let resolved = false

      const rec = new Recorder({
        sourceNode,
        encoderPath: encoderWorkerPath,
        encoderApplication: 2048,
        encoderBitRate: 16000,
        numberOfChannels: 1,
        encoderSampleRate: 16000,
        streamPages: false,
      })

      rec.ondataavailable = (data: ArrayBuffer) => {
        if (!resolved) {
          resolved = true
          resolve(new Blob([data], { type: 'audio/ogg' }))
        }
      }

      rec.start()
        .then(() => {
          bufferSource.start(0)
        })
        .catch((err: Error) => {
          if (!resolved) {
            resolved = true
            void audioCtx.close()
            reject(new AudioConversionError(`Falha ao iniciar codificador: ${err.message}`))
          }
        })

      bufferSource.onended = () => {
        rec.stop()
        void audioCtx.close()
      }
    })
  } catch (error) {
    void audioCtx.close()
    throw error instanceof AudioConversionError
      ? error
      : new AudioConversionError(error instanceof Error ? error.message : 'Falha na codificação Opus.')
  }

  if (oggOpusBlob.size === 0) {
    throw new AudioConversionError('O áudio resultou vazio após codificação.')
  }

  const dataUrl = await blobToDataUrl(oggOpusBlob)
  return { blob: oggOpusBlob, dataUrl, wasConverted: true }
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

export function fileToRawDataUrl(file: Blob): Promise<string> {
  return blobToDataUrl(file)
}

export async function convertWithMediaRecorder(sourceBlob: Blob): Promise<ConversionResult> {
  const arrayBuffer = await sourceBlob.arrayBuffer()

  const audioCtx = new AudioContext()
  let sourceBuffer: AudioBuffer
  try {
    sourceBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0))
  } catch {
    void audioCtx.close()
    throw new AudioConversionError('MediaRecorder: não foi possível decodificar o áudio fonte.')
  }

  const source = audioCtx.createBufferSource()
  source.buffer = sourceBuffer
  const dest = audioCtx.createMediaStreamDestination()
  source.connect(dest)
  source.connect(audioCtx.destination)

  if (typeof MediaRecorder === 'undefined') {
    void audioCtx.close()
    throw new AudioConversionError('MediaRecorder não disponível neste navegador.')
  }

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : null

  if (!mimeType) {
    void audioCtx.close()
    throw new AudioConversionError('MediaRecorder: codec WebM/Opus não suportado.')
  }

  const chunks: Blob[] = []
  const recorder = new MediaRecorder(dest.stream, {
    mimeType,
    audioBitsPerSecond: 16000,
  })

  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  let errorOccurred: string | null = null
  recorder.onerror = () => {
    errorOccurred = 'MediaRecorder: erro interno durante gravação.'
  }

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      void audioCtx.close()
      if (errorOccurred) {
        resolve(new Blob(chunks, { type: mimeType }))
      } else {
        resolve(new Blob(chunks, { type: mimeType }))
      }
    }
  })

  recorder.start()
  source.start(0)

  await new Promise<void>((resolve) => {
    source.onended = () => resolve()
  })

  if (recorder.state === 'recording') {
    recorder.stop()
  }

  const webmBlob = await done

  if (webmBlob.size === 0) {
    throw new AudioConversionError('MediaRecorder: áudio resultante vazio.')
  }

  const dataUrl = await blobToDataUrl(webmBlob)
  return { blob: webmBlob, dataUrl, wasConverted: true }
}

async function validateAudioBlob(blob: Blob): Promise<boolean> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    if (uint8[0] === 0x4F && uint8[1] === 0x67 && uint8[2] === 0x67 && uint8[3] === 0x53) {
      return true
    }
    const audioCtx = new AudioContext()
    await audioCtx.decodeAudioData(arrayBuffer.slice(0))
    void audioCtx.close()
    return true
  } catch {
    return false
  }
}

export async function convertAudioWithFallback(sourceBlob: Blob): Promise<ConversionResult> {
  if (isAlreadyOggOpus(sourceBlob)) {
    const dataUrl = await blobToDataUrl(sourceBlob)
    return { blob: sourceBlob, dataUrl, wasConverted: false }
  }

  try {
    const result = await convertToOggOpus(sourceBlob)
    if (await validateAudioBlob(result.blob)) {
      return result
    }
  } catch {
    // fall through
  }

  try {
    return await convertWithMediaRecorder(sourceBlob)
  } catch {
    // fall through
  }

  const dataUrl = await blobToDataUrl(sourceBlob)
  return { blob: sourceBlob, dataUrl, wasConverted: false }
}
