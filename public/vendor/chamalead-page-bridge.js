(() => {
  const REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_STATUS'
  const RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_STATUS'

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

  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return
    }

    const data = event.data
    if (!data || data.type !== REQUEST_TYPE) {
      return
    }

    const status = getWppStatus()
    window.postMessage(
      {
        type: RESPONSE_TYPE,
        requestId: data.requestId,
        isReady: status.isReady,
        isAuthenticated: status.isAuthenticated,
      },
      '*',
    )
  })
})()
