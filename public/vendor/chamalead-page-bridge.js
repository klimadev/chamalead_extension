(() => {
  const STATUS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_STATUS'
  const STATUS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_STATUS'
  const CHATS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_CHATS'
  const CHATS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_CHATS'
  const SEND_MESSAGE_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE'
  const SEND_MESSAGE_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_RESULT'
  const SEND_MESSAGE_HUMANIZED_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED'
  const SEND_MESSAGE_HUMANIZED_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED_RESULT'
  const SEND_AUDIO_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO'
  const SEND_AUDIO_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO_RESULT'
  const GROUPS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_GROUPS'
  const GROUPS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_GROUPS'
  const PARTICIPANTS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_PARTICIPANTS'
  const PARTICIPANTS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_PARTICIPANTS'
  const PROFILE_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_PROFILE'
  const PROFILE_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_PROFILE'
  const CHATS_LIMIT = 500

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

  function getProfile() {
    const wpp = globalThis.WPP

    try {
      const wid = wpp?.conn?.wid
      if (!wid) {
        return { wid: '', pushname: '' }
      }
      const widStr = typeof wid === 'string' ? wid : String(wid?._serialized || wid?.user || wid)
      const pushname = typeof wpp?.conn?.pushname === 'string'
        ? wpp.conn.pushname
        : (typeof wpp?.conn?.me?.pushname === 'string' ? wpp.conn.me.pushname : '')

      return { wid: widStr, pushname: pushname || '' }
    } catch (_e) {
      return { wid: '', pushname: '' }
    }
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
          const rawContact = raw.contact || {}
          
          const name = 
            chat?.name ||
            rawContact.pushname ||
            rawContact.notifyName ||
            raw.notifyName ||
            ''

          const xContact = chat.__x_contact || chat.contact || rawContact
          const rawId = String(chat?.id?._serialized || chat?.id || '')
          let phone = ''
          if (xContact.__x_phoneNumber && xContact.__x_phoneNumber.user) {
            phone = String(xContact.__x_phoneNumber.user)
          } else if (xContact.phoneNumber) {
            phone = String(xContact.phoneNumber)
          } else if (xContact.id && xContact.id.server === 'c.us') {
            phone = String(xContact.id.user)
          } else if (rawId.includes('@c.us')) {
            phone = rawId.replace('@c.us', '')
          }
          
          return {
            id: rawId,
            name,
            phone,
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

  function getGroups() {
    const wpp = globalThis.WPP
    const status = getWppStatus()

    if (!status.isReady || !status.isAuthenticated) {
      return { groups: [] }
    }

    const listMethod = wpp?.chat?.list

    const fetchChats =
      typeof listMethod === 'function'
        ? listMethod.bind(wpp.chat)
        : null

    if (!fetchChats) {
      return { groups: [] }
    }

    return Promise.resolve(fetchChats({ count: CHATS_LIMIT }))
      .then((chats) => {
        const normalized = Array.isArray(chats) ? chats : []

        const groups = normalized
          .filter((chat) => chat.isGroup === true && !chat.isNewsletter)
          .map((chat) => ({
            id: String(chat?.id?._serialized || chat?.id || ''),
            name: chat?.name || chat?.rawJson?.subject || '',
          }))
          .filter((g) => g.id && g.id.includes('@g.us'))

        console.log('[ChamaLead:bridge] Groups fetched', { total: groups.length })
        return { groups }
      })
      .catch((error) => {
        console.log('[ChamaLead:bridge] Failed to fetch groups', error)
        return { groups: [] }
      })
  }

  function extractParticipantRows(models) {
    const rows = []
    for (const p of models) {
      const rawId = String(p?.id?._serialized || p?.id || '')
      if (!rawId) continue

      const raw = p?.rawJson || {}
      const rawContact = raw.contact || {}
      const contact = p.__x_contact || p.contact || rawContact || {}
      const isAdmin = p.isAdmin === true || p.isSuperAdmin === true

      const name = String(contact.name || contact.pushname || contact.shortName || '')

      let phone = ''
      if (contact.__x_phoneNumber && contact.__x_phoneNumber.user) {
        phone = String(contact.__x_phoneNumber.user)
      } else if (contact.phoneNumber) {
        phone = String(contact.phoneNumber)
      } else if (contact.id && contact.id.server === 'c.us') {
        phone = String(contact.id.user)
      } else if (rawId.includes('@c.us')) {
        phone = rawId.replace('@c.us', '')
      }

      const type = rawId.includes('@lid') ? 'lid' : 'c.us'
      const lid = rawId.includes('@lid') ? rawId : ''

      rows.push({ phone, name, is_admin: isAdmin, type, lid })
    }
    return rows
  }

  function getParticipants(groupId) {
    const wpp = globalThis.WPP
    const status = getWppStatus()

    if (!status.isReady || !status.isAuthenticated) {
      return { participants: [], error: 'WhatsApp not ready' }
    }

    return Promise.resolve().then(async () => {
      const listMethod = wpp?.chat?.list
      if (listMethod) {
        try {
          const allChats = await listMethod.call(wpp.chat, { count: 500 })
          const group = (Array.isArray(allChats) ? allChats : []).find(
            (c) => c.isGroup && String(c?.id?._serialized || c?.id || '') === groupId
          )
          if (group?.groupMetadata?.participants) {
            const parts = group.groupMetadata.participants
            const models = typeof parts.getModelsArray === 'function'
              ? parts.getModelsArray()
              : (Array.isArray(parts) ? parts : [])

            console.log('[ChamaLead:bridge] Participants from chat list', {
              groupId,
              rawCount: models.length,
            })
            const rows = extractParticipantRows(models)
            if (rows.length > 0) {
              const hasPhones = rows.some(r => r.phone && r.phone.length > 0)
              if (hasPhones) {
                return { participants: rows }
              }
              console.log('[ChamaLead:bridge] Chat list participants have no phones, falling back to getParticipants')
            }
            console.log('[ChamaLead:bridge] Chat list returned 0 valid rows, falling back to getParticipants')
          }
        } catch (e) {
          console.log('[ChamaLead:bridge] Chat list lookup failed, falling back', e)
        }
      }

      if (!wpp?.group?.getParticipants) {
        return { participants: [], error: 'WPP.group.getParticipants not available' }
      }

      const participants = await wpp.group.getParticipants(groupId)
      const models = Array.isArray(participants)
        ? participants
        : (participants?.getModelsArray ? participants.getModelsArray() : [])

      console.log('[ChamaLead:bridge] Participants from getParticipants', {
        groupId,
        rawCount: models.length,
      })
      const rows = extractParticipantRows(models)
      return { participants: rows }
    }).catch((error) => {
      console.log('[ChamaLead:bridge] Failed to fetch participants', error)
      return { participants: [], error: String(error) }
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

  function getByteSize(base64DataUrl) {
    const base64 = base64DataUrl.split(',')[1] || base64DataUrl
    return Math.round((base64.length * 3) / 4)
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  function detectMimeType(str) {
    const match = str.match(/^data:([^;]+)/)
    return match ? match[1] : 'unknown'
  }

  async function testAudioDecoding(audioBase64) {
    const LOG = '[ChamaLead:audio-test]'
    const mime = detectMimeType(audioBase64)
    const byteSize = getByteSize(audioBase64)
    console.log(`${LOG} ================================================`)
    console.log(`${LOG} SOURCE: MIME=${mime} Size=${formatSize(byteSize)}`)
    console.log(`${LOG} ================================================`)

    let blob, arrayBuffer

    try {
      const response = await fetch(audioBase64)
      blob = await response.blob()
      arrayBuffer = await blob.arrayBuffer()
    } catch (e) {
      console.log(`${LOG} FETCH failed:`, e)
      return { success: false, error: String(e), methods: [] }
    }

    // Detect actual format from magic bytes
    const view = new Uint8Array(arrayBuffer)
    let magicLabel = 'unknown'
    if (view[0] === 0x4F && view[1] === 0x67 && view[2] === 0x67 && view[3] === 0x53) {
      magicLabel = 'OGG (OggS)'
    } else if ((view[0] === 0xFF && (view[1] & 0xE0) === 0xE0) || (view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33)) {
      magicLabel = 'MP3'
    } else if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
      magicLabel = 'WAV (RIFF)'
    } else if (view[0] === 0xFF && view[1] === 0xF1) {
      magicLabel = 'AAC (ADTS)'
    } else if (view[0] === 0x1A && view[1] === 0x45 && view[2] === 0xDF && view[3] === 0xA3) {
      magicLabel = 'WebM/Matroska'
    }
    console.log(`${LOG} Magic bytes: ${magicLabel} (first 4: ${Array.from(view.slice(0, 8)).map(b => b.toString(16).padStart(2,'0')).join(' ')})`)

    const methods = []
    const logs = []

    function addLog(msg) {
      logs.push(msg)
      console.log(msg)
    }

    // ─── Test 1: <audio> with Blob URL ───
    addLog(`${LOG} ── Test 1: <audio> with Blob URL ──`)
    try {
      const blobUrl = URL.createObjectURL(blob)
      const audio1 = new Audio()
      audio1.preload = 'auto'
      audio1.crossOrigin = 'anonymous'

      const t1Result = await new Promise((resolve) => {
        const tid = setTimeout(() => resolve({ method: '<audio> Blob URL', success: false, duration: null, error: 'Timeout (5s)' }), 5000)

        audio1.onloadedmetadata = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Blob URL', success: true, duration: audio1.duration, error: null })
        }
        audio1.onerror = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Blob URL', success: false, duration: null, error: `MediaError code=${audio1.error?.code} msg=${audio1.error?.message}` })
        }
        audio1.src = blobUrl
        audio1.load()
      })

      URL.revokeObjectURL(blobUrl)
      addLog(`${LOG}   Status: ${t1Result.success ? 'SUCCESS' : 'FAIL'}`)
      addLog(`${LOG}   Duration: ${t1Result.duration || 'N/A'}`)
      if (t1Result.error) addLog(`${LOG}   Error: ${t1Result.error}`)
      methods.push(t1Result)
    } catch (e) {
      addLog(`${LOG}   Exception: ${e}`)
      methods.push({ method: '<audio> Blob URL', success: false, duration: null, error: String(e) })
    }

    // ─── Test 2: <audio> with data URL directly ───
    addLog(`${LOG} ── Test 2: <audio> with data URL ──`)
    try {
      const audio2 = new Audio()
      audio2.preload = 'auto'
      audio2.crossOrigin = 'anonymous'

      const t2Result = await new Promise((resolve) => {
        const tid = setTimeout(() => resolve({ method: '<audio> Data URL', success: false, duration: null, error: 'Timeout (5s)' }), 5000)

        audio2.onloadedmetadata = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Data URL', success: true, duration: audio2.duration, error: null })
        }
        audio2.onerror = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Data URL', success: false, duration: null, error: `MediaError code=${audio2.error?.code} msg=${audio2.error?.message}` })
        }
        audio2.src = audioBase64
        audio2.load()
      })

      addLog(`${LOG}   Status: ${t2Result.success ? 'SUCCESS' : 'FAIL'}`)
      addLog(`${LOG}   Duration: ${t2Result.duration || 'N/A'}`)
      if (t2Result.error) addLog(`${LOG}   Error: ${t2Result.error}`)
      methods.push(t2Result)
    } catch (e) {
      addLog(`${LOG}   Exception: ${e}`)
      methods.push({ method: '<audio> Data URL', success: false, duration: null, error: String(e) })
    }

    // ─── Test 3: <audio> with forced MIME (audio/ogg) ───
    addLog(`${LOG} ── Test 3: <audio> with forced MIME audio/ogg ──`)
    try {
      const forcedBlob = new Blob([blob], { type: 'audio/ogg' })
      const forcedUrl = URL.createObjectURL(forcedBlob)
      const audio3 = new Audio()
      audio3.preload = 'auto'
      audio3.crossOrigin = 'anonymous'

      const t3Result = await new Promise((resolve) => {
        const tid = setTimeout(() => resolve({ method: '<audio> Forced OGG MIME', success: false, duration: null, error: 'Timeout (5s)' }), 5000)

        audio3.onloadedmetadata = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Forced OGG MIME', success: true, duration: audio3.duration, error: null })
        }
        audio3.onerror = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Forced OGG MIME', success: false, duration: null, error: `MediaError code=${audio3.error?.code} msg=${audio3.error?.message}` })
        }
        audio3.src = forcedUrl
        audio3.load()
      })

      URL.revokeObjectURL(forcedUrl)
      addLog(`${LOG}   Status: ${t3Result.success ? 'SUCCESS' : 'FAIL'}`)
      addLog(`${LOG}   Duration: ${t3Result.duration || 'N/A'}`)
      if (t3Result.error) addLog(`${LOG}   Error: ${t3Result.error}`)
      methods.push(t3Result)
    } catch (e) {
      addLog(`${LOG}   Exception: ${e}`)
      methods.push({ method: '<audio> Forced OGG MIME', success: false, duration: null, error: String(e) })
    }

    // ─── Test 4: <audio> with forced MIME (audio/mpeg) ───
    addLog(`${LOG} ── Test 4: <audio> with forced MIME audio/mpeg ──`)
    try {
      const mp3Blob = new Blob([blob], { type: 'audio/mpeg' })
      const mp3Url = URL.createObjectURL(mp3Blob)
      const audio4 = new Audio()
      audio4.preload = 'auto'
      audio4.crossOrigin = 'anonymous'

      const t4Result = await new Promise((resolve) => {
        const tid = setTimeout(() => resolve({ method: '<audio> Forced MP3 MIME', success: false, duration: null, error: 'Timeout (5s)' }), 5000)

        audio4.onloadedmetadata = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Forced MP3 MIME', success: true, duration: audio4.duration, error: null })
        }
        audio4.onerror = () => {
          clearTimeout(tid)
          resolve({ method: '<audio> Forced MP3 MIME', success: false, duration: null, error: `MediaError code=${audio4.error?.code} msg=${audio4.error?.message}` })
        }
        audio4.src = mp3Url
        audio4.load()
      })

      URL.revokeObjectURL(mp3Url)
      addLog(`${LOG}   Status: ${t4Result.success ? 'SUCCESS' : 'FAIL'}`)
      addLog(`${LOG}   Duration: ${t4Result.duration || 'N/A'}`)
      if (t4Result.error) addLog(`${LOG}   Error: ${t4Result.error}`)
      methods.push(t4Result)
    } catch (e) {
      addLog(`${LOG}   Exception: ${e}`)
      methods.push({ method: '<audio> Forced MP3 MIME', success: false, duration: null, error: String(e) })
    }

    // ─── Test 5: Web Audio API decodeAudioData ───
    addLog(`${LOG} ── Test 5: Web Audio API decodeAudioData ──`)
    try {
      const audioCtx = new AudioContext()
      const buf = arrayBuffer.slice(0)
      const decoded = await audioCtx.decodeAudioData(buf)
      void audioCtx.close()

      addLog(`${LOG}   Status: SUCCESS`)
      addLog(`${LOG}   Duration: ${decoded.duration.toFixed(2)}s`)
      addLog(`${LOG}   SampleRate: ${decoded.sampleRate}Hz`)
      addLog(`${LOG}   Channels: ${decoded.numberOfChannels}`)
      methods.push({ method: 'Web Audio API decodeAudioData', success: true, duration: decoded.duration, error: null })
    } catch (e) {
      const errMsg = e instanceof DOMException ? `DOMException: ${e.name} - ${e.message}` : String(e)
      addLog(`${LOG}   Status: FAIL`)
      addLog(`${LOG}   Error: ${errMsg}`)
      methods.push({ method: 'Web Audio API decodeAudioData', success: false, duration: null, error: errMsg })
    }

    // ─── Test 6: canPlayType check ───
    addLog(`${LOG} ── Test 6: canPlayType checks ──`)
    try {
      const probe = new Audio()
      const mimeTypes = [
        'audio/ogg; codecs=opus',
        'audio/ogg; codecs=vorbis',
        'audio/ogg',
        'audio/opus',
        'audio/webm; codecs=opus',
        'audio/mpeg',
        'audio/mp3',
        'audio/mp4; codecs=mp4a.40.2',
        'audio/aac',
        'audio/wav',
      ]
      mimeTypes.forEach((mt) => {
        const result = probe.canPlayType(mt)
        const verdict = result === 'probably' ? 'PROBABLY' : result === 'maybe' ? 'maybe' : 'no'
        addLog(`${LOG}   canPlayType("${mt}"): ${verdict}`)
      })
      methods.push({ method: 'canPlayType', success: true, duration: null, error: null })
    } catch (e) {
      addLog(`${LOG}   Exception: ${e}`)
      methods.push({ method: 'canPlayType', success: false, duration: null, error: String(e) })
    }

    // ─── SUMMARY ───
    const successCount = methods.filter(m => m.success).length
    addLog(`${LOG} ================================================`)
    addLog(`${LOG} SUMMARY: ${successCount}/${methods.length} methods passed`)
    addLog(`${LOG} ================================================`)

    return { success: successCount > 0, methods, logs }
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

      // Convert data URL to File via fetch(blob) to bypass WA-JS regex payload limit
      const response = await fetch(audioBase64)
      const blob = await response.blob()
      const mimeType = 'audio/ogg; codecs=opus'
      const ext = mimeType.split('/')[1] || 'ogg'
      const file = new File([blob], `audio.${ext}`, { type: mimeType })

      const result = await sendMethod.call(wpp.chat, chatId, file, {
        type: 'audio',
        isPtt: true,
      })
      console.log('[ChamaLead:bridge] Audio sent to', phoneNumber, 'MIME:', mimeType, result)
      return { success: true }
    } catch (error) {
      console.log('[ChamaLead:bridge] Failed to send audio', error)
      return { success: false, error: String(error) }
    }
  }

  function randomMicroDelay(minMs, maxMs) {
    const rand = crypto.getRandomValues(new Uint32Array(1))[0]
    const range = maxMs - minMs
    return minMs + (rand % (range + 1))
  }

  function calcTypingDuration(message, speedMsPerChar) {
    const base = message.length * speedMsPerChar
    const variation = 0.85 + (crypto.getRandomValues(new Uint32Array(1))[0] % 31) / 100
    return Math.round(base * variation)
  }

  async function sendMessageHumanized(phoneNumber, message, humanization) {
    console.log('[ChamaLead:bridge] sendMessageHumanized START', phoneNumber, 'config:', JSON.stringify({
      openChat: humanization.openChat,
      readChat: humanization.readChat,
      readCount: humanization.readCount,
      typingSpeedMs: humanization.typingSpeedMs,
      minDelay: humanization.minDelay,
      maxDelay: humanization.maxDelay,
      burstMode: humanization.burstMode,
    }))
    const wpp = globalThis.WPP
    const status = getWppStatus()

    if (!status.isReady || !status.isAuthenticated) {
      return { success: false, error: 'WhatsApp not ready or not authenticated' }
    }

    const chatId = `${phoneNumber}@c.us`

    try {
      if (humanization.openChat) {
        await randomMicroDelay(200, 600)
        try {
          const openMethod = wpp?.chat?.openChatBottom
          if (openMethod) {
            await openMethod.call(wpp.chat, chatId)
          }
        } catch (_e) {
          console.log('[ChamaLead:bridge] openChatBottom failed, continuing', _e)
        }
        await randomMicroDelay(800, 1500)
      }

      if (humanization.readChat && humanization.readCount > 0) {
        await randomMicroDelay(300, 700)
        try {
          const markReadMethod = wpp?.chat?.markIsRead
          if (markReadMethod) {
            await markReadMethod.call(wpp.chat, chatId)
          }
        } catch (_e) {
          console.log('[ChamaLead:bridge] markIsRead failed, continuing', _e)
        }
        await randomMicroDelay(500, 1200)
        try {
          const getMsgMethod = wpp?.chat?.getMessages
          if (getMsgMethod) {
            await getMsgMethod.call(wpp.chat, chatId, { count: humanization.readCount })
          }
        } catch (_e) {
          console.log('[ChamaLead:bridge] getMessages failed, continuing', _e)
        }
        await randomMicroDelay(400, 1000)
      }

      const typingDuration = calcTypingDuration(message, humanization.typingSpeedMs)
      const cappedTyping = Math.min(typingDuration, 30000)

      try {
        const composeMethod = wpp?.chat?.markIsComposing
        if (composeMethod) {
          await composeMethod.call(wpp.chat, chatId, cappedTyping)
        }
      } catch (_e) {
        console.log('[ChamaLead:bridge] markIsComposing failed, continuing', _e)
      }

      await new Promise((resolve) => setTimeout(resolve, cappedTyping))

      const sendMethod = wpp?.chat?.sendTextMessage

      if (!sendMethod) {
        try { wpp?.chat?.markIsPaused?.call(wpp.chat, chatId) } catch (_e) {}
        return { success: false, error: 'Send method not available' }
      }

      let result
      try {
        result = await sendMethod.call(wpp.chat, chatId, message)
      } finally {
        try { wpp?.chat?.markIsPaused?.call(wpp.chat, chatId) } catch (_e) {}
      }

      console.log('[ChamaLead:bridge] Humanized message sent to', phoneNumber)
      return { success: true, result }
    } catch (error) {
      try { globalThis.WPP?.chat?.markIsPaused?.call(globalThis.WPP.chat, chatId) } catch (_e) {}
      console.log('[ChamaLead:bridge] Failed to send humanized message', error)
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

    if (data.type === SEND_MESSAGE_HUMANIZED_REQUEST_TYPE) {
      const phoneNumber = data.phoneNumber
      const message = data.message
      const humanization = data.humanizationConfig

      if (!phoneNumber || !message) {
        window.postMessage(
          {
            type: SEND_MESSAGE_HUMANIZED_RESPONSE_TYPE,
            requestId: data.requestId,
            success: false,
            error: 'Missing phoneNumber or message',
          },
          '*',
        )
        return
      }

      void Promise.resolve(sendMessageHumanized(phoneNumber, message, humanization || {})).then((result) => {
        window.postMessage(
          {
            type: SEND_MESSAGE_HUMANIZED_RESPONSE_TYPE,
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

    if (data.type === GROUPS_REQUEST_TYPE) {
      void Promise.resolve(getGroups()).then((result) => {
        window.postMessage(
          {
            type: GROUPS_RESPONSE_TYPE,
            requestId: data.requestId,
            groups: result.groups,
          },
          '*',
        )
      })
    }

    if (data.type === PARTICIPANTS_REQUEST_TYPE) {
      void Promise.resolve(getParticipants(data.groupId)).then((result) => {
        window.postMessage(
          {
            type: PARTICIPANTS_RESPONSE_TYPE,
            requestId: data.requestId,
            participants: result.participants,
            error: result.error,
          },
          '*',
        )
      })
    }

    if (data.type === PROFILE_REQUEST_TYPE) {
      const profile = getProfile()
      window.postMessage(
        {
          type: PROFILE_RESPONSE_TYPE,
          requestId: data.requestId,
          wid: profile.wid,
          pushname: profile.pushname,
        },
        '*',
      )
    }
  })
})()
