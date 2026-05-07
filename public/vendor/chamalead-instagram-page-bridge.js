(() => {
  const REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_IG_PROFILE'
  const RESPONSE_TYPE = 'CHAMALEAD_PAGE_IG_PROFILE_RESULT'
  const FIXED_DOC_ID = '27077551658551360'

  function getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"]`)
    return meta?.getAttribute('content') || ''
  }

  function readHtmlToken(pattern) {
    const html = document.documentElement?.innerHTML || ''
    const match = html.match(pattern)
    return match?.[1] || ''
  }

  function getProfileUsername() {
    const segments = window.location.pathname.split('/').filter(Boolean)
    if (segments.length !== 1) {
      return ''
    }

    const candidate = segments[0]
    return /^[A-Za-z0-9._]+$/.test(candidate) ? candidate : ''
  }

  function isProfilePage() {
    return getProfileUsername().length > 0
  }

  function readSessionContext() {
    return {
      actorID: readHtmlToken(/"actorID":"(\d+)"/) || readHtmlToken(/"NON_FACEBOOK_USER_ID":"(\d+)"/) || '',
      profileId: readHtmlToken(/"profile_id":"(\d+)"/) || readHtmlToken(/"id":"(\d+)"/) || readHtmlToken(/"pk":"(\d+)"/) || '',
      csrf: getMetaContent('csrf-token') || readHtmlToken(/"csrf_token":"([^"]+)"/) || '',
      lsd: getMetaContent('lsd') || readHtmlToken(/"lsd":"([^"]+)"/) || '',
      fbDtsg: readHtmlToken(/"fb_dtsg":"([^"]+)"/) || '',
      appId: readHtmlToken(/"appId":"([^"]+)"/) || getMetaContent('app-id') || '',
    }
  }

  function normalizeProfile(user) {
    const followerCount = Number(user?.edge_followed_by?.count)
    const followingCount = Number(user?.edge_follow?.count)
    const postCount = Number(user?.edge_owner_to_timeline_media?.count)

    return {
      id: String(user?.id || user?.pk || ''),
      username: String(user?.username || ''),
      fullName: String(user?.full_name || user?.fullName || ''),
      biography: String(user?.biography || user?.bio || ''),
      profileImageUrl: String(user?.profile_pic_url_hd || user?.profile_pic_url || ''),
      websiteUrl: user?.external_url ? String(user.external_url) : null,
      followerCount: Number.isFinite(followerCount) ? followerCount : null,
      followingCount: Number.isFinite(followingCount) ? followingCount : null,
      postCount: Number.isFinite(postCount) ? postCount : null,
      isPrivate: typeof user?.is_private === 'boolean' ? user.is_private : null,
      isVerified: typeof user?.is_verified === 'boolean' ? user.is_verified : null,
      isBusinessAccount: typeof user?.is_business_account === 'boolean' ? user.is_business_account : null,
      isProfessionalAccount: typeof user?.is_professional_account === 'boolean' ? user.is_professional_account : null,
      linkedFacebookPage: user?.connected_fb_page?.name ? String(user.connected_fb_page.name) : null,
      friendshipStatus: String(user?.friendship_status || user?.relationship_status || '' ) || null,
    }
  }

  async function fetchProfile(username) {
    const context = readSessionContext()

    if (!isProfilePage()) {
      return { success: false, error: { code: 'non_profile_page', message: 'Abra um perfil do Instagram para consultar os detalhes.' } }
    }

    if (!context.csrf || !context.lsd || !context.fbDtsg || !context.appId || (!context.actorID && !context.profileId)) {
      return { success: false, error: { code: 'missing_tokens', message: 'Não foi possível localizar os tokens de sessão necessários.' } }
    }

    try {
      const variables = {
        username: username || getProfileUsername(),
        actorID: context.actorID || context.profileId,
        profile_id: context.profileId,
        lsd: context.lsd,
        fb_dtsg: context.fbDtsg,
        appId: context.appId,
      }

      const body = new URLSearchParams({
        doc_id: FIXED_DOC_ID,
        variables: JSON.stringify(variables),
      })

      const response = await fetch('https://www.instagram.com/graphql/query', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-csrftoken': context.csrf,
          'x-ig-app-id': context.appId,
          'x-fb-lsd': context.lsd,
          'x-requested-with': 'XMLHttpRequest',
        },
        body,
      })

      if (response.status === 401 || response.status === 403) {
        return { success: false, error: { code: 'unauthenticated', message: 'A sessão do Instagram não está autenticada.' } }
      }

      const payload = await response.json()

      if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
        return {
          success: false,
          error: {
            code: 'graphql_error',
            message: payload.errors[0]?.message || 'O Instagram retornou um erro ao consultar o perfil.',
          },
        }
      }

      const user = payload?.data?.user || payload?.data?.xdt_api__v1__users__web_info__query?.user || null
      if (!user) {
        return { success: false, error: { code: 'runtime_error', message: 'O perfil consultado não retornou dados.' } }
      }

      return { success: true, profile: normalizeProfile(user) }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Falha de rede ao consultar o Instagram.',
        },
      }
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return
    }

    const data = event.data
    if (!data || data.type !== REQUEST_TYPE) {
      return
    }

    void Promise.resolve(fetchProfile(data.username)).then((result) => {
      window.postMessage({
        type: RESPONSE_TYPE,
        requestId: data.requestId,
        success: result.success === true,
        profile: result.profile || null,
        error: result.error || null,
      }, '*')
    })
  })
})()
