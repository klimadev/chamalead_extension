import { Button, Card } from '@/ui'

import type { InstagramProfileState } from './instagram-profile'

function formatNumber(value: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Não informado'
  }

  return new Intl.NumberFormat('pt-BR').format(value)
}

function renderBoolean(value: boolean | null): string {
  if (value === null) {
    return 'Não informado'
  }

  return value ? 'Sim' : 'Não'
}

export function InstagramProfileDetails({ profileState, onRetry }: { profileState: InstagramProfileState; onRetry: () => void }) {
  if (profileState.isLoading) {
    return (
      <Card title="Perfil do Instagram" className="instagram-profile-card instagram-profile-card--state">
        <p className="muted">Carregando perfil aberto...</p>
      </Card>
    )
  }

  if (profileState.error) {
    return (
      <Card title="Perfil do Instagram" className="instagram-profile-card instagram-profile-card--state">
        <div className="instagram-empty-state">
          <p className="instagram-empty-title">{profileState.error.message}</p>
          <p className="muted">Erro: {profileState.error.code}</p>
          <Button className="button--soft" onClick={onRetry}>Tentar de novo</Button>
        </div>
      </Card>
    )
  }

  if (!profileState.profile) {
    return (
      <Card title="Perfil do Instagram" className="instagram-profile-card instagram-profile-card--state">
        <div className="instagram-empty-state">
          <p className="instagram-empty-title">Abra um perfil</p>
          <p className="muted">Vá para um perfil no Instagram e atualize.</p>
          <Button className="button--soft" onClick={onRetry}>Recarregar</Button>
        </div>
      </Card>
    )
  }

  const profile = profileState.profile
  const details = [
    ['Privado', renderBoolean(profile.isPrivate)],
    ['Verificado', renderBoolean(profile.isVerified)],
    ['Profissional', renderBoolean(profile.isProfessionalAccount)],
    ['Comercial', renderBoolean(profile.isBusinessAccount)],
    ['Página Facebook', profile.linkedFacebookPage],
    ['Status de amizade', profile.friendshipStatus],
  ] as const

  return (
    <Card title="Perfil do Instagram" className="instagram-profile-card">
      <div className="instagram-profile-hero">
        <div className="instagram-profile-identity">
          {profile.profileImageUrl ? (
            <img className="instagram-avatar" src={profile.profileImageUrl} alt={profile.username} />
          ) : (
            <div className="instagram-avatar instagram-avatar--fallback">@</div>
          )}

          <div>
            <p className="section-kicker">Identidade</p>
            <h3 className="instagram-profile-name">{profile.fullName || profile.username}</h3>
            <p className="instagram-profile-username">@{profile.username}</p>
          </div>
        </div>

        <div className="instagram-profile-badges">
          <span className="instagram-profile-badge">{profile.isPrivate ? 'Conta privada' : 'Conta pública'}</span>
          {profile.isVerified ? <span className="instagram-profile-badge instagram-profile-badge--accent">Verificada</span> : null}
        </div>
      </div>

      {profile.biography ? <p className="instagram-profile-bio">{profile.biography}</p> : <p className="muted">Sem biografia informada.</p>}

      <div className="instagram-profile-stats">
        <div className="instagram-profile-stat"><strong>{formatNumber(profile.followerCount)}</strong><span>Seguidores</span></div>
        <div className="instagram-profile-stat"><strong>{formatNumber(profile.followingCount)}</strong><span>Seguindo</span></div>
        <div className="instagram-profile-stat"><strong>{formatNumber(profile.postCount)}</strong><span>Publicações</span></div>
      </div>

      <div className="instagram-profile-details">
        {details.map(([label, value]) => (
          <div className="instagram-profile-detail" key={label}>
            <span>{label}</span>
            <strong>{value ?? 'Não informado'}</strong>
          </div>
        ))}
      </div>

      <div className="instagram-profile-footer">
        {profile.websiteUrl ? (
          <a className="instagram-profile-link" href={profile.websiteUrl} target="_blank" rel="noreferrer noopener">
            Abrir site
          </a>
        ) : (
          <span className="muted">Sem site.</span>
        )}

        <Button className="button--soft instagram-profile-retry" onClick={onRetry}>Atualizar</Button>
      </div>
    </Card>
  )
}
