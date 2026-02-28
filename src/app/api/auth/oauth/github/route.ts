import { NextResponse } from "next/server";
import { getGitHubAuthorizeUrl, setGitHubCallbackUrl, generateOAuthState } from "@/lib/oauth";

/**
 * GitHub OAuth 入口
 * 重定向用户到 GitHub 授权页面
 */
export async function GET(req: Request) {
  // 检查环境变量
  if (!process.env.GITHUB_CLIENT_ID) {
    return NextResponse.json(
      {
        error: "GitHub OAuth 未配置",
        message: "请在 .env.local 中设置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET",
      },
      { status: 500 }
    );
  }

  // 从当前请求获取正确的回调地址
  const url = new URL(req.url);
  const callbackUrl = `${url.protocol}//${url.host}/api/auth/callback/github`;
  setGitHubCallbackUrl(callbackUrl);

  // 生成 state 并存储到 Cookie
  const state = await generateOAuthState();

  // 生成 GitHub 授权 URL
  const authorizeUrl = getGitHubAuthorizeUrl(state);

  // 重定向到 GitHub
  return NextResponse.redirect(authorizeUrl);
}
