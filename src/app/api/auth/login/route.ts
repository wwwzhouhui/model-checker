import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signToken, createTokenCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  const db = getDb();

  const usersResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = usersResult[0];
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  // OAuth 用户没有密码，不能通过邮箱密码登录
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "该账号使用第三方登录，请使用 GitHub 或 LinuxDo 登录" },
      { status: 401 }
    );
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  // 邮箱注册用户必定有 email，使用非空断言
  const token = await signToken(user.id, user.email!);
  const res = NextResponse.json({
    user: { id: user.id, email: user.email! },
  });
  res.cookies.set(createTokenCookie(token));
  return res;
}
