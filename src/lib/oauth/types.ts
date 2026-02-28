/** OAuth 厂商类型 */
export type OAuthProvider = "github" | "linuxdo";

/** OAuth 授权状态存储 */
export interface OAuthState {
  /** 随机生成的 state 字符串 */
  state: string;
  /** 重定向后的目标页面 */
  redirect?: string;
}

/**
 * GitHub OAuth Token 响应
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */
export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

/**
 * GitHub 用户信息
 * @see https://docs.github.com/en/rest/users/users
 */
export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  blog: string | null;
}

/**
 * LinuxDo/Discourse OAuth Token 响应
 * @see https://docs.discourse.org/
 */
export interface LinuxDoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

/**
 * LinuxDo/Discourse 用户信息
 * 基于 Discourse User API
 */
export interface LinuxDoUser {
  id: number;
  username: string;
  name?: string;
  avatar_url: string;
  email?: string;
  /** Discourse external_id (通常是 OAuth provider 的用户 ID) */
  external_id?: string;
  /** Discourse 用户组 */
  groups?: Array<{ id: number; name: string }>;
}

/**
 * 统一的用户信息（来自 OAuth）
 */
export interface OAuthUserInfo {
  /** OAuth 厂商 */
  provider: OAuthProvider;
  /** OAuth 平台的用户 ID */
  oauthId: string;
  /** 用户名（用于显示） */
  username: string;
  /** 邮箱（可能为空） */
  email: string | null;
  /** 头像 URL */
  avatarUrl: string;
}

/**
 * OAuth 错误类型
 */
export interface OAuthError {
  error: string;
  error_description?: string;
}
