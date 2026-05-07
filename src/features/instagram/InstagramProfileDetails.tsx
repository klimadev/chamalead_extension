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
      <Card title="Perfil do Instagram">
        <p className="muted">Consultando o perfil aberto no Instagram Web...</p>
      </Card>
    )
  }

  if (profileState.error) {
    return (
      <Card title="Perfil do Instagram">
        <div className="instagram-empty-state">
          <p className="instagram-empty-title">{profileState.error.message}</p>
          <p className="muted">Código: {profileState.error.code}</p>
          <Button className="button--soft" onClick={onRetry}>Tentar novamente</Button>
        </div>
      </Card>
    )
  }

  if (!profileState.profile) {
    return (
      <Card title="Perfil do Instagram">
        <div className="instagram-empty-state">
          <p className="instagram-empty-title">Nenhum perfil disponível</p>
          <p className="muted">Abra um perfil público ou autenticado no Instagram Web e tente novamente.</p>
          <Button className="button--soft" onClick={onRetry}>Recarregar</Button>
        </div>
      </Card>
    )
  }

  const profile = profileState.profile

  return (
    <Card title="Perfil do Instagram">
      <div className="instagram-profile-card">
        <div className="instagram-profile-header">
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

        {profile.biography ? <p className="instagram-profile-bio">{profile.biography}</p> : <p className="muted">Sem biografia informada.</p>}

        <div className="instagram-profile-grid">
          <div className="instagram-profile-stat"><strong>{formatNumber(profile.followerCount)}</strong><span>Seguidores</span></div>
          <div className="instagram-profile-stat"><strong>{formatNumber(profile.followingCount)}</strong><span>Seguindo</span></div>
          <div className="instagram-profile-stat"><strong>{formatNumber(profile.postCount)}</strong><span>Publicações</span></div>
        </div>

        <div className="instagram-profile-fields">
          <div><span>Privado</span><strong>{renderBoolean(profile.isPrivate)}</strong></div>
          <div><span>Verificado</span><strong>{renderBoolean(profile.isVerified)}</strong></div>
          <div><span>Conta profissional</span><strong>{renderBoolean(profile.isProfessionalAccount)}</strong></div>
          <div><span>Conta comercial</span><strong>{renderBoolean(profile.isBusinessAccount)}</strong></div>
          <div><span>Página Facebook</span><strong>{profile.linkedFacebookPage ?? 'Não informado'}</strong></div>
          <div><span>Status de amizade</span><strong>{profile.friendshipStatus ?? 'Não informado'}</strong></div>
        </div>

        {profile.websiteUrl && (
          <a className="instagram-profile-link" href={profile.websiteUrl} target="_blank" rel="noreferrer noopener">
            {profile.websiteUrl}
          </a>
        )}

        <Button className="button--soft instagram-profile-retry" onClick={onRetry}>Atualizar perfil</Button>
      </div>
    </Card>
  )
}
