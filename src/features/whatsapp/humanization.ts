export type HumanizationProfile = 'conservative' | 'balanced' | 'aggressive' | 'custom'

export interface HumanizationConfig {
  profile: HumanizationProfile
  minDelay: number
  maxDelay: number
  typingSpeedMs: number
  openChat: boolean
  readChat: boolean
  readCount: number
  burstMode: boolean
  burstSize: number
  burstPauseMin: number
  burstPauseMax: number
}

export const CONSERVATIVE_CONFIG: HumanizationConfig = {
  profile: 'conservative',
  minDelay: 45000,
  maxDelay: 180000,
  typingSpeedMs: 220,
  openChat: true,
  readChat: true,
  readCount: 8,
  burstMode: false,
  burstSize: 0,
  burstPauseMin: 0,
  burstPauseMax: 0,
}

export const BALANCED_CONFIG: HumanizationConfig = {
  profile: 'balanced',
  minDelay: 25000,
  maxDelay: 90000,
  typingSpeedMs: 150,
  openChat: true,
  readChat: true,
  readCount: 4,
  burstMode: true,
  burstSize: 4,
  burstPauseMin: 300000,
  burstPauseMax: 480000,
}

export const AGGRESSIVE_CONFIG: HumanizationConfig = {
  profile: 'aggressive',
  minDelay: 12000,
  maxDelay: 50000,
  typingSpeedMs: 90,
  openChat: false,
  readChat: false,
  readCount: 0,
  burstMode: false,
  burstSize: 0,
  burstPauseMin: 0,
  burstPauseMax: 0,
}

export function getProfileConfig(
  profile: HumanizationProfile,
  custom?: Partial<HumanizationConfig>,
): HumanizationConfig {
  const base = profile === 'conservative'
    ? CONSERVATIVE_CONFIG
    : profile === 'aggressive'
      ? AGGRESSIVE_CONFIG
      : BALANCED_CONFIG

  if (profile === 'custom' && custom) {
    return {
      profile: 'custom',
      minDelay: custom.minDelay ?? BALANCED_CONFIG.minDelay,
      maxDelay: custom.maxDelay ?? BALANCED_CONFIG.maxDelay,
      typingSpeedMs: custom.typingSpeedMs ?? BALANCED_CONFIG.typingSpeedMs,
      openChat: custom.openChat ?? true,
      readChat: custom.readChat ?? true,
      readCount: custom.readCount ?? 4,
      burstMode: custom.burstMode ?? false,
      burstSize: custom.burstSize ?? 0,
      burstPauseMin: custom.burstPauseMin ?? 0,
      burstPauseMax: custom.burstPauseMax ?? 0,
    }
  }

  if (custom) {
    return {
      ...base,
      ...custom,
      profile,
    }
  }

  return { ...base }
}

const PRE_MSG_OVERHEAD_MS = 1000
const POST_MSG_OVERHEAD_MS = 800
const CHAT_OPEN_OVERHEAD_MS = 2000
const READ_CHAT_OVERHEAD_MS = 1500
const EXISTENCE_CHECK_OVERHEAD_MS = 1500

export function estimateMessagePipelineDurationMs(
  message: string,
  config: HumanizationConfig,
): number {
  let total = 0

  total += EXISTENCE_CHECK_OVERHEAD_MS

  if (config.openChat) {
    total += CHAT_OPEN_OVERHEAD_MS
  }

  if (config.readChat && config.readCount > 0) {
    total += READ_CHAT_OVERHEAD_MS
  }

  const avgCharPerMs = config.typingSpeedMs / 1000
  const typingDuration = message.length * avgCharPerMs * 1000

  total += typingDuration

  total += PRE_MSG_OVERHEAD_MS
  total += POST_MSG_OVERHEAD_MS

  return Math.min(total, 300000)
}

export function estimateCampaignDurationMs(
  recipientCount: number,
  avgMsgLength: number,
  config: HumanizationConfig,
): number {
  const pipelineDuration = estimateMessagePipelineDurationMs(
    'x'.repeat(avgMsgLength),
    config,
  )

  const avgDelay = (config.minDelay + config.maxDelay) / 2

  const messagesPerBurst = config.burstMode ? config.burstSize : 0
  const avgBurstPause = (config.burstPauseMin + config.burstPauseMax) / 2

  let total = 0
  let burstCount = 0

  for (let i = 0; i < recipientCount; i++) {
    total += pipelineDuration

    if (i < recipientCount - 1) {
      if (config.burstMode && messagesPerBurst > 0 && burstCount < messagesPerBurst - 1) {
        burstCount++
        total += avgDelay
      } else {
        total += avgBurstPause
        burstCount = 0
      }
    }
  }

  return total
}

export function formatDuration(ms: number): string {
  const totalMinutes = ms / 60000
  if (totalMinutes < 60) {
    const mins = Math.round(totalMinutes)
    return `${mins} min`
  }
  const hours = totalMinutes / 60
  if (hours < 10) {
    return `${hours.toFixed(1)} horas`
  }
  return `${Math.round(hours)} horas`
}
