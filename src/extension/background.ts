chrome.runtime.onInstalled.addListener(() => {
  console.info('ChamaLead extension instalada com sucesso.')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'CHAMALEAD_HEALTHCHECK') {
    sendResponse({ ok: true, tabId: sender.tab?.id ?? null })
  }
})
