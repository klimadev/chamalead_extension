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

  function readCount(...values) {
    for (const value of values) {
      const count = Number(value)
      if (Number.isFinite(count)) {
        return count
      }
    }

    return null
  }

  function readBoolean(...values) {
    for (const value of values) {
      if (typeof value === 'boolean') {
        return value
      }
    }

    return null
  }

  function readString(...values) {
    for (const value of values) {
      if (typeof value === 'string' && value.length > 0) {
        return value
      }
    }

    return null
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
      profileId: readHtmlToken(/"profile_id":"(\d+)"/) || readHtmlToken(/"id":"(\d{8,})"/) || readHtmlToken(/"pk":"(\d+)"/) || '',
      csrf: getMetaContent('csrf-token') || readHtmlToken(/"csrf_token":"([^"]+)"/) || '',
      lsd: getMetaContent('lsd') || readHtmlToken(/"LSD",\[\],\{"token":"([^"]+)"/) || '',
      fbDtsg: readHtmlToken(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/) || '',
      appId: readHtmlToken(/"APP_ID":"(\d+)"/) || getMetaContent('app-id') || '',
    }
  }

  function normalizeProfile(user) {
    const followerCount = readCount(user?.edge_followed_by?.count, user?.follower_count)
    const followingCount = readCount(user?.edge_follow?.count, user?.following_count)
    const postCount = readCount(user?.edge_owner_to_timeline_media?.count, user?.media_count)

    return {
      id: String(user?.id || user?.pk || ''),
      username: String(user?.username || ''),
      fullName: String(user?.full_name || user?.fullName || ''),
      biography: String(user?.biography || user?.bio || ''),
      profileImageUrl: String(user?.profile_pic_url_hd || user?.hd_profile_pic_url_info?.url || user?.profile_pic_url || ''),
      websiteUrl: user?.external_url ? String(user.external_url) : null,
      followerCount,
      followingCount,
      postCount,
      isPrivate: readBoolean(user?.is_private),
      isVerified: readBoolean(user?.is_verified),
      isBusinessAccount: readBoolean(user?.is_business_account, user?.is_business),
      isProfessionalAccount: readBoolean(user?.is_professional_account),
      linkedFacebookPage: readString(user?.connected_fb_page?.name, user?.linked_fb_info?.linked_fb_page?.name),
      friendshipStatus: readString(user?.friendship_status, user?.relationship_status),
    }
  }

  async function fetchProfile() {
    const context = readSessionContext()

    if (!isProfilePage()) {
      return { success: false, error: { code: 'non_profile_page', message: 'Abra um perfil do Instagram para consultar os detalhes.' } }
    }

    if (!context.csrf || !context.lsd || !context.fbDtsg || !context.appId || !context.actorID || !context.profileId) {
      return { success: false, error: { code: 'missing_tokens', message: 'Não foi possível localizar os tokens de sessão necessários.' } }
    }

    try {
      const variables = {
        enable_integrity_filters: true,
        id: context.profileId,
        __relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider: true,
        __relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider: false,
        __relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider: false,
        __relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider: false,
      }

      const body = new URLSearchParams({
        av: context.actorID,
        __user: '0',
        __a: '1',
        fb_dtsg: context.fbDtsg,
        lsd: context.lsd,
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'PolarisProfilePageContentQuery',
        server_timestamps: 'true',
        variables: JSON.stringify(variables),
        doc_id: FIXED_DOC_ID,
      })

      const response = await fetch('https://www.instagram.com/graphql/query', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-csrftoken': context.csrf,
          'x-fb-lsd': context.lsd,
          'x-ig-app-id': context.appId,
          'x-fb-friendly-name': 'PolarisProfilePageContentQuery',
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
