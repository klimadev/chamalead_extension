export interface InstagramProfile {
  id: string
  username: string
  fullName: string
  biography: string
  profileImageUrl: string
  websiteUrl: string | null
  followerCount: number | null
  followingCount: number | null
  postCount: number | null
  isPrivate: boolean | null
  isVerified: boolean | null
  isBusinessAccount: boolean | null
  isProfessionalAccount: boolean | null
  linkedFacebookPage: string | null
  friendshipStatus: string | null
}

export type InstagramProfileErrorCode =
  | 'non_profile_page'
  | 'missing_tokens'
  | 'unauthenticated'
  | 'graphql_error'
  | 'network_error'
  | 'runtime_error'

export interface InstagramProfileError {
  code: InstagramProfileErrorCode
  message: string
}

export interface InstagramProfileState {
  profile: InstagramProfile | null
  error: InstagramProfileError | null
  isLoading: boolean
  lastUpdatedAt: number | null
}

export interface InstagramProfileMessageResponse {
  success: boolean
  profile?: InstagramProfile | null
  error?: InstagramProfileError | null
}
