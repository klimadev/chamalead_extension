export interface CsvRecipient {
  phone: string
  variables: Record<string, string>
}

export interface CsvVariableMap {
  name: string
  value: string
  isBlank: boolean
}

export interface BulkSendPayload {
  numbersText: string
  messageText: string
  isAudio: boolean
  audioBase64?: string
  recipients?: CsvRecipient[]
  fallbackMessage?: string
}

export type PlaceholderToken = {
  name: string
  start: number
  end: number
}

export function extractPlaceholders(text: string): PlaceholderToken[] {
  const tokens: PlaceholderToken[] = []
  const regex = /\{\{([^}]+)\}\}/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      name: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return tokens
}

export function renderMessage(
  template: string,
  variables: Record<string, string>,
  usedVariableNames: string[],
): string {
  if (usedVariableNames.length === 0) {
    return template
  }

  let result = template

  for (const varName of usedVariableNames) {
    const value = variables[varName] ?? ''
    const pattern = `\\{\\{${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`
    const regex = new RegExp(pattern, 'g')
    result = result.replace(regex, value)
  }

  result = result.replace(/\{\{[^}]+\}\}/g, '')

  return result
}

export function shouldUseFallback(
  _template: string,
  variables: Record<string, string>,
  usedVariableNames: string[],
): boolean {
  if (usedVariableNames.length === 0) {
    return false
  }

  for (const varName of usedVariableNames) {
    const value = variables[varName] ?? ''
    if (value.trim().length === 0) {
      return true
    }
  }

  return false
}

export function getUsedVariableNames(placeholders: PlaceholderToken[]): string[] {
  const names = new Set<string>()

  for (const token of placeholders) {
    if (token.name.length > 0) {
      names.add(token.name)
    }
  }

  return Array.from(names)
}

export function validatePlaceholders(
  placeholders: PlaceholderToken[],
  availableHeaders: string[],
): { valid: boolean; unknown: string[] } {
  const availableSet = new Set(availableHeaders.map((h) => h.trim()))
  const unknown: string[] = []

  for (const token of placeholders) {
    if (!availableSet.has(token.name)) {
      unknown.push(token.name)
    }
  }

  return {
    valid: unknown.length === 0,
    unknown,
  }
}