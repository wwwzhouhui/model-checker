import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import type {
  GitHubTokenResponse,
  GitHubUser,
  OAuthState,
  OAuthUserInfo,
  OAuthError,
} from "./types";

/**
 * GitHub OAuth 配置
 */
const GITHUB_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID || "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  userApiUrl: "https://api.github.com/user",
  scope: "user:email read:user",
  // 超时配置（毫秒）
  timeout: parseInt(process.env.GITHUB_OAUTH_TIMEOUT || "30000", 10),
  // 重试次数
  maxRetries: parseInt(process.env.GITHUB_OAUTH_MAX_RETRIES || "3", 10),
};

// 动态回调 URL（从请求中获取）
let dynamicCallbackUrl: string | null = null;

/**
 * 创建带超时的 fetch
 */
async function fetchWithTimeout(
  url: RequestInfo | URL,
  options: RequestInit = {},
  timeout = GITHUB_CONFIG.timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时（${timeout}ms），请检查网络连接或稍后重试`);
    }
    throw error;
  }
}

/**
 * 带重试的 fetch
 */
async function fetchWithRetry(
  url: RequestInfo | URL,
  options: RequestInit = {},
  retries = GITHUB_CONFIG.maxRetries
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        // 指数退避：等待 2^i 秒后重试
        const delay = Math.pow(2, i) * 1000;
        console.log(`[GitHub OAuth] 请求失败，${delay}ms 后重试 (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 设置回调 URL（从请求中动态获取）
 */
export function setGitHubCallbackUrl(url: string): void {
  dynamicCallbackUrl = url;
}

/**
 * 获取回调 URL
 */
function getCallbackUrl(): string {
  if (dynamicCallbackUrl) {
    return dynamicCallbackUrl;
  }
  // 默认使用环境变量或 localhost:3000
  const baseUrl = process.env.OAUTH_CALLBACK_URL || process.env.VERCEL_URL || "http://localhost:3000";
  return `${baseUrl}/api/auth/callback/github`;
}

/**
 * 生成 GitHub OAuth 授权 URL
 */
export function getGitHubAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: GITHUB_CONFIG.clientId,
    state,
    scope: GITHUB_CONFIG.scope,
    redirect_uri: getCallbackUrl(),
  });
  return `${GITHUB_CONFIG.authorizeUrl}?${params.toString()}`;
}

/**
 * 用 authorization code 换取 access token
 * @throws OAuthError
 */
export async function exchangeCodeForToken(
  code: string
): Promise<GitHubTokenResponse> {
  console.log("[GitHub OAuth] 交换 access token...");

  try {
    const response = await fetchWithRetry(GITHUB_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CONFIG.clientId,
        client_secret: GITHUB_CONFIG.clientSecret,
        code,
        redirect_uri: getCallbackUrl(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[GitHub OAuth] Token 交换失败:", {
        status: response.status,
        statusText: response.statusText,
        body: text,
      });
      const error: OAuthError = await response.json().catch(() => ({
        error: "http_error",
        error_description: `HTTP ${response.status}: ${text}`,
      }));
      throw error;
    }

    const data: GitHubTokenResponse = await response.json();
    if ("error" in data) {
      throw data as OAuthError;
    }

    console.log("[GitHub OAuth] Token 获取成功");
    return data;
  } catch (error) {
    console.error("[GitHub OAuth] Token 交换异常:", error);

    // 提供更友好的错误信息
    if (error instanceof Error) {
      if (error.message.includes("超时")) {
        throw {
          error: "timeout",
          error_description: "连接 GitHub 超时，可能是网络问题。建议：1) 稍后重试 2) 使用 VPN 3) 使用 LinuxDo 登录",
        };
      }
      if (error.message.includes("ECONNREFUSED") || error.message.includes("Connect")) {
        throw {
          error: "network_error",
          error_description: "无法连接到 GitHub，可能是网络问题。建议使用 LinuxDo 登录或配置代理",
        };
      }
    }

    throw error;
  }
}

/**
 * 获取 GitHub 用户信息
 * @throws OAuthError
 */
export async function getGitHubUser(
  accessToken: string
): Promise<GitHubUser> {
  console.log("[GitHub OAuth] 获取用户信息...");

  try {
    const response = await fetchWithRetry(GITHUB_CONFIG.userApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "Model-Checker",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[GitHub OAuth] 获取用户信息失败:", {
        status: response.status,
        body: text,
      });
      throw {
        error: "fetch_user_failed",
        error_description: `HTTP ${response.status}: ${text}`,
      };
    }

    const user = await response.json();
    console.log("[GitHub OAuth] 用户信息获取成功:", user.login);
    return user;
  } catch (error) {
    console.error("[GitHub OAuth] 获取用户信息异常:", error);
    throw error;
  }
}

/**
 * 将 GitHub 用户信息转换为统一的 OAuthUserInfo 格式
 */
export function normalizeGitHubUser(user: GitHubUser): OAuthUserInfo {
  return {
    provider: "github",
    oauthId: String(user.id),
    username: user.login,
    email: user.email,
    avatarUrl: user.avatar_url,
  };
}

/**
 * 生成并存储 OAuth state（用于 CSRF 防护）
 * @returns state 字符串
 */
export async function generateOAuthState(): Promise<string> {
  const state = randomBytes(16).toString("hex");

  // 将 state 存储到 Cookie
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 分钟有效
  });

  return state;
}

/**
 * 验证 OAuth state
 */
export async function verifyOAuthState(
  state: string | null
): Promise<boolean> {
  if (!state) return false;

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  // 验证后删除 state cookie
  cookieStore.delete("oauth_state");

  return storedState === state;
}
