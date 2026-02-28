import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signToken, createTokenCookie } from "@/lib/auth";
import {
  exchangeGitHubCodeForToken,
  getGitHubUser,
  normalizeGitHubUser,
  verifyOAuthState,
} from "@/lib/oauth";

/**
 * GitHub OAuth 回调处理
 *
 * OAuth 流程：
 * 1. 用户点击"GitHub登录" → 重定向到 /api/auth/oauth/github
 * 2. GitHub 授权页面 → 用户授权
 * 3. GitHub 回调 → /api/auth/callback/github?code=xxx&state=xxx
 * 4. 后端处理 → 用 code 换 token → 获取用户信息 → 创建/查找用户 → 设置 JWT
 * 5. 重定向回首页（已登录状态）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // 处理 OAuth 授权拒绝
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  // 验证参数
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?error=missing_params", req.url)
    );
  }

  // 验证 state（防 CSRF）
  const stateValid = await verifyOAuthState(state);
  if (!stateValid) {
    return NextResponse.redirect(
      new URL("/?error=invalid_state", req.url)
    );
  }

  try {
    // 用 code 换取 access token
    const tokenResponse = await exchangeGitHubCodeForToken(code);

    // 获取 GitHub 用户信息
    const githubUser = await getGitHubUser(tokenResponse.access_token);

    // 转换为统一格式
    const oauthUser = normalizeGitHubUser(githubUser);

    // 查找或创建用户
    const db = getDb();
    let user = db
      .select()
      .from(users)
      .where(
        and(
          eq(users.oauthProvider, "github"),
          eq(users.oauthId, oauthUser.oauthId)
        )
      )
      .get();

    if (!user) {
      // 首次登录，创建新用户
      const result = db
        .insert(users)
        .values({
          email: oauthUser.email,
          passwordHash: null, // OAuth 用户没有密码
          oauthProvider: "github",
          oauthId: oauthUser.oauthId,
          avatarUrl: oauthUser.avatarUrl,
          username: oauthUser.username,
        })
        .returning()
        .get();
      user = result;
    } else {
      // 已存在用户，更新信息
      const updated = db
        .update(users)
        .set({
          avatarUrl: oauthUser.avatarUrl,
          username: oauthUser.username,
        })
        .where(eq(users.id, user.id))
        .returning()
        .get();
      user = updated;
    }

    // 生成 JWT Token
    const token = await signToken(user.id, user.email || oauthUser.username);

    // 设置 Cookie 并重定向回首页
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(createTokenCookie(token));
    return res;
  } catch (err) {
    console.error("GitHub OAuth error:", err);

    // 获取错误信息
    let errorCode = "oauth_failed";
    let errorDesc = "";

    if (err && typeof err === "object") {
      if ("error" in err) {
        errorCode = (err as any).error;
      }
      if ("error_description" in err) {
        errorDesc = (err as any).error_description;
      }
    } else if (err instanceof Error) {
      errorDesc = err.message;
    }

    // 构建错误参数
    const errorParam = errorDesc
      ? `${errorCode}:${encodeURIComponent(errorDesc)}`
      : errorCode;

    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorParam)}`, req.url)
    );
  }
}
