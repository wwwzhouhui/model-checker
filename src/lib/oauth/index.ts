/**
 * OAuth 工具库
 *
 * 提供 GitHub 和 LinuxDo OAuth 登录的工具函数
 */

// 类型导出
export type {
  OAuthProvider,
  OAuthState,
  GitHubTokenResponse,
  GitHubUser,
  LinuxDoTokenResponse,
  LinuxDoUser,
  OAuthUserInfo,
  OAuthError,
} from "./types";

// GitHub OAuth 函数
export {
  getGitHubAuthorizeUrl,
  exchangeCodeForToken as exchangeGitHubCodeForToken,
  getGitHubUser,
  normalizeGitHubUser,
  generateOAuthState,
  verifyOAuthState,
  setGitHubCallbackUrl,
} from "./github";

// LinuxDo OAuth 函数
export {
  getLinuxDoAuthorizeUrl,
  exchangeCodeForToken as exchangeLinuxDoCodeForToken,
  getLinuxDoUser,
  normalizeLinuxDoUser,
  setLinuxDoCallbackUrl,
} from "./linuxdo";
