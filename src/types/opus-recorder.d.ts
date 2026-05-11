declare module 'opus-recorder' {
  interface RecorderConfig {
    sourceNode?: MediaStreamAudioSourceNode
    encoderPath?: string
    encoderApplication?: number
    encoderBitRate?: number
    encoderComplexity?: number
    encoderFrameSize?: number
    encoderSampleRate?: number
    maxFramesPerPage?: number
    monitorGain?: number
    numberOfChannels?: number
    recordingGain?: number
    resampleQuality?: number
    streamPages?: boolean
    wavBitDepth?: number
    bufferLength?: number
    mediaTrackConstraints?: MediaTrackConstraints | boolean
    originalSampleRateOverride?: number
  }

  class Recorder {
    constructor(config?: RecorderConfig)
    start(): Promise<void>
    stop(): void
    close(): Promise<void>
    pause(flush?: boolean): Promise<unknown>
    resume(): void
    encodedSamplePosition: number
    ondataavailable: ((data: ArrayBuffer) => void) | null
    onstart: (() => void) | null
    onstop: (() => void) | null
    onpause: (() => void) | null
    onresume: (() => void) | null
    static isRecordingSupported(): boolean
    static version: string
  }

  export default Recorder
}

declare module 'opus-recorder/dist/encoderWorker.min.js?url' {
  const url: string
  export default url
}
