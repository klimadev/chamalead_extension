chrome.runtime.onInstalled.addListener(() => {
  console.info('ChamaLead extension instalada com sucesso.')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'CHAMALEAD_GET_WPP_STATUS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const waTab = tabs.find(
        (tab) => tab.url && tab.url.includes('web.whatsapp.com'),
      )
      if (waTab?.id) {
        chrome.tabs.sendMessage(waTab.id, message, (response) => {
          sendResponse(response)
        })
        return true
      }
      sendResponse({ isReady: false, isAuthenticated: false, error: 'WA tab not found' })
    })
    return true
  }

  if (message?.type === 'CHAMALEAD_SEND_AUDIO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const waTab = tabs.find(
        (tab) => tab.url && tab.url.includes('web.whatsapp.com'),
      )
      if (waTab?.id) {
        chrome.tabs.sendMessage(waTab.id, message, (response) => {
          sendResponse(response)
        })
        return true
      }
      sendResponse({ success: false, error: 'WA tab not found' })
    })
    return true
  }

  if (message?.type === 'CHAMALEAD_HEALTHCHECK') {
    sendResponse({ ok: true, tabId: sender.tab?.id ?? null })
  }
})
