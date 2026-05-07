import { useCallback, useEffect, useState } from 'react'

export type SiteFeatureTabId = 'bulk'

export interface SupportedSiteDefinition {
  id: 'whatsapp'
  label: string
  description: string
  featureTabs: readonly SiteFeatureTabId[]
  matches: (url: string) => boolean
}

export interface UnsupportedSiteDefinition {
  id: 'unsupported'
  label: string
  description: string
  featureTabs: readonly []
  matches: (url: string) => boolean
}

export type SiteDefinition = SupportedSiteDefinition | UnsupportedSiteDefinition

export interface LoadingSiteContext {
  state: 'loading'
  site: null
  activeTabUrl: null
  siteLabel: string
  siteDescription: string
  featureTabs: readonly []
  isSupported: false
}

export interface ResolvedSiteContext {
  state: 'resolved'
  site: SiteDefinition
  activeTabUrl: string | null
  siteLabel: string
  siteDescription: string
  featureTabs: readonly SiteFeatureTabId[]
  isSupported: boolean
}

export type ActiveSiteContext = LoadingSiteContext | ResolvedSiteContext

export const WHATSAPP_SITE: SupportedSiteDefinition = {
  id: 'whatsapp',
  label: 'WhatsApp',
  description: 'Envio em massa e status operacional para WhatsApp Web.',
  featureTabs: ['bulk'],
  matches: (url) => url.startsWith('https://web.whatsapp.com/'),
}

export const UNSUPPORTED_SITE: UnsupportedSiteDefinition = {
  id: 'unsupported',
  label: 'Site não suportado',
  description: 'Este site ainda não tem features ativas do ChamaLead.',
  featureTabs: [],
  matches: () => false,
}

export const SITE_REGISTRY = [WHATSAPP_SITE] as const

const SITE_REFRESH_INTERVAL_MS = 2000

export function detectSiteFromUrl(url: string | null | undefined): SiteDefinition {
  if (!url) {
    return UNSUPPORTED_SITE
  }

  return SITE_REGISTRY.find((site) => site.matches(url)) ?? UNSUPPORTED_SITE
}

async function resolveActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0] ?? null
}

export async function resolveActiveSiteContext(): Promise<ActiveSiteContext> {
  try {
    const tab = await resolveActiveTab()
    const site = detectSiteFromUrl(tab?.url)

    return {
      state: 'resolved',
      site,
      activeTabUrl: tab?.url ?? null,
      siteLabel: site.label,
      siteDescription: site.description,
      featureTabs: site.featureTabs,
      isSupported: site.id !== 'unsupported',
    }
  } catch (error) {
    console.error('[ChamaLead:site-context] Failed to resolve active site', error)

    return {
      state: 'loading',
      site: null,
      activeTabUrl: null,
      siteLabel: 'Detectando site',
      siteDescription: 'Não foi possível identificar o site ativo no momento.',
      featureTabs: [],
      isSupported: false,
    }
  }
}

export function useActiveSiteContext() {
  const [siteContext, setSiteContext] = useState<ActiveSiteContext>({
    state: 'loading',
    site: null,
    activeTabUrl: null,
    siteLabel: 'Detectando site',
    siteDescription: 'A extensão está identificando o site ativo.',
    featureTabs: [],
    isSupported: false,
  })

  const refresh = useCallback(async () => {
    const nextContext = await resolveActiveSiteContext()
    setSiteContext(nextContext)
  }, [])

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => {
      void refresh()
    }, 0)

    const intervalId = window.setInterval(() => {
      void refresh()
    }, SITE_REFRESH_INTERVAL_MS)

    return () => {
      window.clearTimeout(initialRefreshId)
      window.clearInterval(intervalId)
    }
  }, [refresh])

  return { siteContext, refresh }
}
