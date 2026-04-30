(() => {
  const STATUS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_STATUS'
  const STATUS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_STATUS'
  const CHATS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_CHATS'
  const CHATS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_CHATS'
  const SEND_MESSAGE_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE'
  const SEND_MESSAGE_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_RESULT'
  const SEND_AUDIO_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO'
  const SEND_AUDIO_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO_RESULT'
  const CHATS_LIMIT = 100

  function getWppStatus() {
    const wpp = globalThis.WPP

    if (!wpp || typeof wpp !== 'object') {
      return { isReady: false, isAuthenticated: false }
    }

    const isReady = wpp.isReady === true
    let isAuthenticated = false

    if (isReady && wpp.conn) {
      if (typeof wpp.conn.isAuthenticated === 'function') {
        try {
          isAuthenticated = wpp.conn.isAuthenticated() === true
        } catch (_error) {
          isAuthenticated = false
        }
      } else if (typeof wpp.conn.isAuthenticated === 'boolean') {
        isAuthenticated = wpp.conn.isAuthenticated
      }
    }

    return { isReady, isAuthenticated }
  }

  function getChats() {
    const wpp = globalThis.WPP
    const status = getWppStatus()

    if (!status.isReady || !status.isAuthenticated) {
      return { chats: [], total: 0, limitedTo: CHATS_LIMIT }
    }

    const listMethod = wpp?.chat?.list

    const fetchChats =
      typeof listMethod === 'function'
        ? listMethod.bind(wpp.chat)
        : null

    if (!fetchChats) {
      return { chats: [], total: 0, limitedTo: CHATS_LIMIT }
    }

    return Promise.resolve(fetchChats({ count: CHATS_LIMIT }))
      .then((chats) => {
        const normalized = Array.isArray(chats) ? chats : []
        
        const sorted = normalized.sort((a, b) => {
          const timeA = typeof a?.t === 'number' ? a.t : 0
          const timeB = typeof b?.t === 'number' ? b.t : 0
          return timeB - timeA
        })
        
        const mapped = sorted.slice(0, CHATS_LIMIT).map((chat) => {
          const raw = chat?.rawJson || {}
          const contact = raw.contact || {}
          
          const name = 
            chat?.name ||
            contact.pushname ||
            contact.notifyName ||
            raw.notifyName ||
            ''
          
          return {
            id: String(chat?.id?._serialized || chat?.id || ''),
            name,
            isGroup: chat?.isGroup === true,
            isNewsletter: chat?.isNewsletter === true,
            lastMessage: chat?.lastMessage?.body || '',
            unreadCount: typeof chat?.unreadCount === 'number' ? chat.unreadCount : 0,
          }
        })

        console.log('[ChamaLead:bridge] Chats fetched', {
          total: normalized.length,
          limited: mapped.length,
          sample: mapped[0] || null,
        })

        return {
          chats: mapped.filter((chat) => chat.id),
          total: normalized.length,
          limitedTo: CHATS_LIMIT,
        }
      })
      .catch((error) => {
        console.log('[ChamaLead:bridge] Failed to fetch chats', error)
        return { chats: [], total: 0, limitedTo: CHATS_LIMIT }
      })
  }

  async function sendMessage(phoneNumber, message) {
    const wpp = globalThis.WPP
    const status = getWppStatus()

    if (!status.isReady || !status.isAuthenticated) {
      return { success: false, error: 'WhatsApp not ready or not authenticated' }
    }

    try {
      const chatId = `${phoneNumber}@c.us`
      const sendMethod = wpp?.chat?.sendTextMessage
      
      if (!sendMethod) {
        return { success: false, error: 'Send method not available' }
      }

      await sendMethod.call(wpp.chat, chatId, message)
      console.log('[ChamaLead:bridge] Message sent to', phoneNumber)
      return { success: true }
    } catch (error) {
      console.log('[ChamaLead:bridge] Failed to send message', error)
      return { success: false, error: String(error) }
    }
  }

  async function sendAudio(phoneNumber, audioBase64) {
    const wpp = globalThis.WPP
    const status = getWppStatus()

    if (!status.isReady || !status.isAuthenticated) {
      return { success: false, error: 'WhatsApp not ready or not authenticated' }
    }

    try {
      const chatId = `${phoneNumber}@c.us`
      const sendMethod = wpp?.chat?.sendFileMessage

      if (!sendMethod) {
        return { success: false, error: 'Send method not available' }
      }

      // Ensure audioBase64 is a proper data URL with correct MIME type
      let mediaData = audioBase64
      if (mediaData && !mediaData.startsWith('data:')) {
        // If raw base64 without data URL prefix, assume audio/ogg for PTT
        mediaData = `data:audio/ogg;base64,${mediaData}`
      }

      const result = await sendMethod.call(wpp.chat, chatId, mediaData, {
        type: 'audio',
        isPtt: true,
        waveform: true
      })
      console.log('[ChamaLead:bridge] Audio sent to', phoneNumber, result)
      return { success: true }
    } catch (error) {
      console.log('[ChamaLead:bridge] Failed to send audio', error)
      return { success: false, error: String(error) }
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return
    }

    const data = event.data
    if (!data || typeof data.type !== 'string') {
      return
    }

    if (data.type === STATUS_REQUEST_TYPE) {
      const status = getWppStatus()
      window.postMessage(
        {
          type: STATUS_RESPONSE_TYPE,
          requestId: data.requestId,
          isReady: status.isReady,
          isAuthenticated: status.isAuthenticated,
        },
        '*',
      )
      return
    }

    if (data.type === CHATS_REQUEST_TYPE) {
      void Promise.resolve(getChats()).then((result) => {
        window.postMessage(
          {
            type: CHATS_RESPONSE_TYPE,
            requestId: data.requestId,
            chats: result.chats,
            total: result.total,
            limitedTo: result.limitedTo,
          },
          '*',
        )
      })
    }

    if (data.type === SEND_MESSAGE_REQUEST_TYPE) {
      const phoneNumber = data.phoneNumber
      const message = data.message

      if (!phoneNumber || !message) {
        window.postMessage(
          {
            type: SEND_MESSAGE_RESPONSE_TYPE,
            requestId: data.requestId,
            success: false,
            error: 'Missing phoneNumber or message',
          },
          '*',
        )
        return
      }

      void Promise.resolve(sendMessage(phoneNumber, message)).then((result) => {
        window.postMessage(
          {
            type: SEND_MESSAGE_RESPONSE_TYPE,
            requestId: data.requestId,
            success: result.success,
            error: result.error,
          },
          '*',
        )
      })
      return
    }

    if (data.type === SEND_AUDIO_REQUEST_TYPE) {
      const phoneNumber = data.phoneNumber
      const audioBase64 = data.audioBase64

      if (!phoneNumber || !audioBase64) {
        window.postMessage(
          {
            type: SEND_AUDIO_RESPONSE_TYPE,
            requestId: data.requestId,
            success: false,
            error: 'Missing phoneNumber or audioBase64',
          },
          '*',
        )
        return
      }

      void Promise.resolve(sendAudio(phoneNumber, audioBase64)).then((result) => {
        window.postMessage(
          {
            type: SEND_AUDIO_RESPONSE_TYPE,
            requestId: data.requestId,
            success: result.success,
            error: result.error,
          },
          '*',
        )
      })
    }
  })
})()
