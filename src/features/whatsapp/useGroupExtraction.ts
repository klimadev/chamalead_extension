import { useState, useCallback } from 'react'

export interface WppGroup {
  id: string
  name: string
}

export interface ParticipantRow {
  group_name: string
  phone: string
  is_admin: boolean
}

export function useGroupExtraction() {
  const [groups, setGroups] = useState<WppGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))

      if (!waTab?.id) {
        setError('Abra o WhatsApp Web primeiro')
        return
      }

      const response = await chrome.tabs.sendMessage(waTab.id, {
        type: 'CHAMALEAD_GET_WPP_GROUPS',
      })

      const fetched = Array.isArray(response?.groups) ? (response.groups as WppGroup[]) : []
      setGroups(fetched)
      if (fetched.length === 0) {
        setError('Nenhum grupo encontrado')
      }
    } catch (err) {
      console.error('[ChamaLead] Failed to fetch groups', err)
      setError('Erro ao buscar grupos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const extractParticipants = useCallback(
    async (groupId: string): Promise<{ participants: ParticipantRow[]; error: string | null }> => {
      const group = groups.find((g) => g.id === groupId)
      const groupName = group?.name || groupId

      try {
        const tabs = await chrome.tabs.query({ currentWindow: true })
        const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))

        if (!waTab?.id) {
          return { participants: [], error: 'Abra o WhatsApp Web primeiro' }
        }

        const response = await chrome.tabs.sendMessage(waTab.id, {
          type: 'CHAMALEAD_GET_WPP_PARTICIPANTS',
          groupId,
        })

        if (response?.error) {
          console.warn('[ChamaLead] Extraction error for group', groupId, response.error)
          return { participants: [], error: String(response.error) }
        }

        const participants = Array.isArray(response?.participants)
          ? response.participants
          : []
        console.log('[ChamaLead] Participants received', { groupId, count: participants.length })

        const rows: ParticipantRow[] = participants.map(
          (p: { phone?: string; is_admin?: boolean }) => ({
            group_name: groupName,
            phone: String(p.phone || ''),
            is_admin: p.is_admin === true,
          }),
        )

        return { participants: rows, error: null }
      } catch (err) {
        console.warn('[ChamaLead] Failed to extract participants from group', groupId, err)
        return { participants: [], error: String(err) }
      }
    },
    [groups],
  )

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    extractParticipants,
  }
}
