import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/ui'

declare const EXT_VERSION: string

interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  downloadUrl: string | null
  changelog: string | null
  publishedAt: string | null
  checkedAt: string | null
  error?: string
}

function formatDate(value: string | null): string | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed)
}

export function UpdatesTab() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_GET_INFO' }, (response: UpdateInfo | null) => {
      setUpdateInfo(response)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local') return

      const nextValue = changes['chamalead_update_info']?.newValue as UpdateInfo | undefined
      if (nextValue !== undefined) {
        setUpdateInfo(nextValue ?? null)
        setIsLoading(false)
        setIsChecking(false)
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const handleCheckNow = useCallback(() => {
    setIsChecking(true)
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_CHECK_NOW' }, (response: UpdateInfo | null) => {
      setUpdateInfo(response)
      setIsChecking(false)
      setIsLoading(false)
    })
  }, [])

  const handleDownload = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_DOWNLOAD' }, () => {})
  }, [])

  const handleViewRelease = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_VIEW_RELEASE' }, () => {})
  }, [])

  const checkedAtLabel = useMemo(() => formatDate(updateInfo?.checkedAt ?? null), [updateInfo?.checkedAt])
  const publishedAtLabel = useMemo(() => formatDate(updateInfo?.publishedAt ?? null), [updateInfo?.publishedAt])

  return (
    <Card title="Atualizações">
      <div className="updates-panel">
        <div className="updates-summary">
          <div className="update-version-block">
            <span className="update-kicker">Versão instalada</span>
            <strong className="update-version-value">v{updateInfo?.currentVersion ?? EXT_VERSION}</strong>
          </div>

          <button
            className="update-btn check"
            onClick={handleCheckNow}
            disabled={isChecking}
          >
            {isChecking ? 'Verificando...' : 'Verificar agora'}
          </button>
        </div>

        {isLoading && <p className="update-status-message">Carregando status de atualização...</p>}

        {!isLoading && !updateInfo && !isChecking && (
          <div className="update-state-card neutral" role="status">
            <h3 className="update-state-title">Nenhuma verificação recente</h3>
            <p className="update-status-message">Clique em "Verificar agora" para consultar a release mais recente.</p>
          </div>
        )}

        {!isLoading && isChecking && (
          <div className="update-state-card neutral" role="status">
            <h3 className="update-state-title">Verificando atualizações</h3>
            <p className="update-status-message">Buscando a release mais recente no GitHub.</p>
          </div>
        )}

        {!isLoading && updateInfo?.error && !isChecking && (
          <div className="update-state-card error" role="alert">
            <h3 className="update-state-title">Falha ao verificar</h3>
            <p className="update-status-message">{updateInfo.error}</p>
            {checkedAtLabel && <p className="update-meta">Ultima tentativa: {checkedAtLabel}</p>}
          </div>
        )}

        {!isLoading && updateInfo && !updateInfo.error && !isChecking && updateInfo.available && (
          <div className="update-state-card success" role="alert" aria-label="Atualização disponível">
            <div className="update-state-header">
              <div>
                <h3 className="update-state-title">Nova versão disponível</h3>
                <p className="update-highlight">v{updateInfo.latestVersion}</p>
              </div>
              {publishedAtLabel && <p className="update-meta">Publicada em {publishedAtLabel}</p>}
            </div>

            {updateInfo.changelog ? (
              <details className="update-changelog">
                <summary>Ver changelog</summary>
                <div className="changelog-text">{updateInfo.changelog}</div>
              </details>
            ) : (
              <p className="update-status-message">Essa release nao trouxe descricao publicada.</p>
            )}

            <div className="update-actions" role="group" aria-label="Ações de atualização">
              {updateInfo.downloadUrl && (
                <button className="update-btn download" onClick={handleDownload}>
                  Baixar ZIP
                </button>
              )}
              <button className="update-btn view" onClick={handleViewRelease}>
                Ver release
              </button>
            </div>

            {updateInfo.downloadUrl && (
              <a
                href={updateInfo.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="update-direct-link"
              >
                {updateInfo.downloadUrl}
              </a>
            )}
          </div>
        )}

        {!isLoading && updateInfo && !updateInfo.error && !isChecking && !updateInfo.available && updateInfo.checkedAt && (
          <div className="update-state-card ok" role="status">
            <h3 className="update-state-title">Extensão atualizada</h3>
            <p className="update-status-message">Nenhuma release mais recente foi encontrada.</p>
            {checkedAtLabel && <p className="update-meta">Ultima verificacao: {checkedAtLabel}</p>}
          </div>
        )}
      </div>
    </Card>
  )
}
