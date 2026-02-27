import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signToken, createTokenCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "密码长度不能少于 6 位" },
      { status: 400 }
    );
  }

  const db = getDb();

  // 检查邮箱是否已注册
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  // 创建用户
  const passwordHash = await hash(password, 10);
  const result = db
    .insert(users)
    .values({ email, passwordHash })
    .returning()
    .get();

  // 签发 JWT
  const token = await signToken(result.id, result.email);
  const res = NextResponse.json({
    user: { id: result.id, email: result.email },
  });
  res.cookies.set(createTokenCookie(token));
  return res;
}
