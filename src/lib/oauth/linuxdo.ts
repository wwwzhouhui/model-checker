import type {
  LinuxDoTokenResponse,
  LinuxDoUser,
  OAuthUserInfo,
  OAuthError,
} from "./types";

/**
 * LinuxDo OAuth 配置
 * LinuxDo 基于 Discourse，使用标准 OAuth2
 */
const LINUXDO_CONFIG = {
  clientId: process.env.LINUXDO_CLIENT_ID || "",
  clientSecret: process.env.LINUXDO_CLIENT_SECRET || "",
  baseUrl: process.env.LINUXDO_BASE_URL || "https://connect.linux.do",
  authorizeUrl: "https://connect.linux.do/oauth2/authorize",
  tokenUrl: "https://connect.linux.do/oauth2/token",
  userApiUrl: "https://connect.linux.do/api/user",
  // 超时配置（毫秒）
  timeout: parseInt(process.env.LINUXDO_OAUTH_TIMEOUT || "30000", 10),
};

// 动态回调 URL（从请求中获取）
let dynamicCallbackUrl: string | null = null;

/**
 * 设置回调 URL（从请求中动态获取）
 */
export function setLinuxDoCallbackUrl(url: string): void {
  dynamicCallbackUrl = url;
}

/**
 * 创建带超时的 fetch
 */
async function fetchWithTimeout(
  url: RequestInfo | URL,
  options: RequestInit = {},
  timeout = LINUXDO_CONFIG.timeout
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
      throw new Error(`请求超时（${timeout}ms）`);
    }
    throw error;
  }
}

/**
 * 生成 LinuxDo OAuth 授权 URL
 */
export function getLinuxDoAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINUXDO_CONFIG.clientId,
    state,
    scope: "read",
    redirect_uri: getCallbackUrl(),
  });
  return `${LINUXDO_CONFIG.authorizeUrl}?${params.toString()}`;
}

/**
 * 获取 OAuth 回调 URL
 */
function getCallbackUrl(): string {
  // 优先使用动态设置的回调地址
  if (dynamicCallbackUrl) {
    return dynamicCallbackUrl;
  }
  // 支持环境变量配置，默认使用当前域名
  const baseUrl = process.env.OAUTH_CALLBACK_URL || process.env.VERCEL_URL || "http://localhost:3000";
  return `${baseUrl}/api/auth/callback/linuxdo`;
}

/**
 * 用 authorization code 换取 access token
 * LinuxDo/Discourse 使用 form-urlencoded 格式
 * @throws OAuthError
 */
export async function exchangeCodeForToken(
  code: string
): Promise<LinuxDoTokenResponse> {
  console.log("[LinuxDo OAuth] 交换 access token...");

  // Discourse OAuth2 使用 form-urlencoded 格式
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: LINUXDO_CONFIG.clientId,
    client_secret: LINUXDO_CONFIG.clientSecret,
    code,
    redirect_uri: getCallbackUrl(),
  });

  try {
    const response = await fetchWithTimeout(LINUXDO_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[LinuxDo OAuth] Token 交换失败:", {
        status: response.status,
        statusText: response.statusText,
        body: text,
        url: LINUXDO_CONFIG.tokenUrl,
      });
      try {
        const error = JSON.parse(text);
        throw error;
      } catch {
        throw {
          error: "http_error",
          error_description: `HTTP ${response.status}: ${text}`,
        };
      }
    }

    console.log("[LinuxDo OAuth] Token 获取成功");
    const data: LinuxDoTokenResponse = await response.json();
    if ("error" in data) {
      throw data as OAuthError;
    }
    return data;
  } catch (error) {
    console.error("[LinuxDo OAuth] Token 交换异常:", error);
    throw error;
  }
}

/**
 * 获取 LinuxDo 用户信息
 * LinuxDo/Discourse 用户信息 API
 * @throws OAuthError
 */
export async function getLinuxDoUser(
  accessToken: string
): Promise<LinuxDoUser> {
  console.log("[LinuxDo OAuth] 获取用户信息...");

  try {
    const response = await fetchWithTimeout(LINUXDO_CONFIG.userApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "Model-Checker",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[LinuxDo OAuth] 获取用户信息失败:", {
        status: response.status,
        body: text,
      });
      throw {
        error: "fetch_user_failed",
        error_description: `HTTP ${response.status}: ${text}`,
      };
    }

    const data = await response.json();

    // Discourse API 返回格式：{ user: { ... } }
    // 处理可能的嵌套结构
    const user: LinuxDoUser = data.user || data;

    console.log("[LinuxDo OAuth] 用户信息获取成功:", user.username);

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar_url: user.avatar_url || `https://connect.linux.do/user_avatar/linux.do/${user.username}/size/240`,
      email: user.email,
      external_id: user.external_id,
      groups: user.groups,
    };
  } catch (error) {
    console.error("[LinuxDo OAuth] 获取用户信息异常:", error);
    throw error;
  }
}

/**
 * 将 LinuxDo 用户信息转换为统一的 OAuthUserInfo 格式
 */
export function normalizeLinuxDoUser(user: LinuxDoUser): OAuthUserInfo {
  return {
    provider: "linuxdo",
    // 使用 external_id（GitHub ID）或本地 ID
    oauthId: String(user.external_id || user.id),
    username: user.username,
    email: user.email || null,
    avatarUrl: user.avatar_url,
  };
}
