import { NextResponse } from "next/server";
import { getLinuxDoAuthorizeUrl, setLinuxDoCallbackUrl } from "@/lib/oauth";
import { generateOAuthState } from "@/lib/oauth/github";

/**
 * LinuxDo OAuth 入口
 * 重定向用户到 LinuxDo 授权页面
 */
export async function GET(req: Request) {
  // 检查环境变量
  if (!process.env.LINUXDO_CLIENT_ID) {
    return NextResponse.json(
      {
        error: "LinuxDo OAuth 未配置",
        message: "请在 .env.local 中设置 LINUXDO_CLIENT_ID 和 LINUXDO_CLIENT_SECRET",
      },
      { status: 500 }
    );
  }

  // 从当前请求获取正确的回调地址
  const url = new URL(req.url);
  const callbackUrl = `${url.protocol}//${url.host}/api/auth/callback/linuxdo`;
  setLinuxDoCallbackUrl(callbackUrl);

  // 生成 state 并存储到 Cookie（复用 GitHub 的函数）
  const state = await generateOAuthState();

  // 生成 LinuxDo 授权 URL
  const authorizeUrl = getLinuxDoAuthorizeUrl(state);

  // 重定向到 LinuxDo
  return NextResponse.redirect(authorizeUrl);
}
