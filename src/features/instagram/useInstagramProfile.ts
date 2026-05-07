import { useCallback, useEffect, useState } from 'react'

import type { InstagramProfileError, InstagramProfileState } from './instagram-profile'

function createInitialState(): InstagramProfileState {
  return {
    profile: null,
    error: null,
    isLoading: true,
    lastUpdatedAt: null,
  }
}

export function useInstagramProfile(enabled = true) {
  const [state, setState] = useState<InstagramProfileState>(createInitialState)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    const fetchProfile = async () => {
      setState((current) => ({ ...current, isLoading: true }))

      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        const instagramTab = tabs[0]?.url?.includes('instagram.com') ? tabs[0] : null

        if (!instagramTab?.id) {
          if (!cancelled) {
            setState({
              profile: null,
              error: { code: 'non_profile_page', message: 'Abra um perfil do Instagram para consultar os detalhes.' },
              isLoading: false,
              lastUpdatedAt: Date.now(),
            })
          }
          return
        }

        const response = await chrome.tabs.sendMessage(instagramTab.id, {
          type: 'CHAMALEAD_GET_IG_PROFILE',
        }) as { success?: boolean; profile?: unknown; error?: InstagramProfileError | null } | undefined

        if (cancelled) {
          return
        }

        if (response?.success && response.profile) {
          setState({
            profile: response.profile as InstagramProfileState['profile'],
            error: null,
            isLoading: false,
            lastUpdatedAt: Date.now(),
          })
          return
        }

        setState({
          profile: null,
          error: response?.error ?? { code: 'runtime_error', message: 'Falha ao consultar o perfil do Instagram.' },
          isLoading: false,
          lastUpdatedAt: Date.now(),
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState({
          profile: null,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Erro de rede ao consultar o Instagram.',
          },
          isLoading: false,
          lastUpdatedAt: Date.now(),
        })
      }
    }

    void fetchProfile()

    return () => {
      cancelled = true
    }
  }, [enabled, refreshNonce])

  return {
    profileState: enabled ? state : createInitialState(),
    refresh,
  }
}
