import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { savedConfigs } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/crypto";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/configs/[id] - 获取单个配置（含解密 API Key） */
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const configId = parseInt(id, 10);
  if (isNaN(configId)) {
    return NextResponse.json({ error: "无效的配置 ID" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(savedConfigs)
    .where(eq(savedConfigs.id, configId))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return NextResponse.json({ error: "配置不存在" }, { status: 404 });
  }

  if (row.userId !== user.userId) {
    return NextResponse.json({ error: "无权操作此配置" }, { status: 403 });
  }

  return NextResponse.json({
    config: {
      id: row.id,
      name: row.name,
      base_url: row.baseUrl,
      api_key: decryptApiKey(row.apiKeyEnc),
      provider: row.provider ?? "openai",
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    },
  });
}

/** PUT /api/configs/[id] - 编辑配置 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const configId = parseInt(id, 10);
  if (isNaN(configId)) {
    return NextResponse.json({ error: "无效的配置 ID" }, { status: 400 });
  }

  const body = await req.json();
  const { name, base_url, api_key, provider } = body as {
    name?: string;
    base_url?: string;
    api_key?: string;
    provider?: string;
  };

  if (!name && !base_url && !api_key && !provider) {
    return NextResponse.json(
      { error: "至少需要提供一个更新字段" },
      { status: 400 }
    );
  }

  const db = getDb();

  // 查找记录并验证归属
  const existingRows = await db
    .select()
    .from(savedConfigs)
    .where(eq(savedConfigs.id, configId))
    .limit(1);
  const existing = existingRows[0];

  if (!existing) {
    return NextResponse.json({ error: "配置不存在" }, { status: 404 });
  }

  if (existing.userId !== user.userId) {
    return NextResponse.json({ error: "无权操作此配置" }, { status: 403 });
  }

  // 构建更新字段
  const updateValues: Partial<{
    name: string;
    baseUrl: string;
    apiKeyEnc: string;
    provider: string;
    updatedAt: string;
  }> = {
    updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
  };

  if (name) updateValues.name = name;
  if (base_url !== undefined) updateValues.baseUrl = base_url;
  if (api_key) updateValues.apiKeyEnc = encryptApiKey(api_key);
  if (provider) updateValues.provider = provider;

  const result = await db
    .update(savedConfigs)
    .set(updateValues)
    .where(and(eq(savedConfigs.id, configId), eq(savedConfigs.userId, user.userId)))
    .returning();
  const updated = result[0];

  const plainKey = api_key ?? decryptApiKey(updated.apiKeyEnc);

  return NextResponse.json({
    config: {
      id: updated.id,
      name: updated.name,
      base_url: updated.baseUrl,
      api_key_masked: maskApiKey(plainKey),
      provider: updated.provider ?? "openai",
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    },
  });
}

/** DELETE /api/configs/[id] - 删除配置 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const configId = parseInt(id, 10);
  if (isNaN(configId)) {
    return NextResponse.json({ error: "无效的配置 ID" }, { status: 400 });
  }

  const db = getDb();

  // 查找记录并验证归属
  const existingRows = await db
    .select()
    .from(savedConfigs)
    .where(eq(savedConfigs.id, configId))
    .limit(1);
  const existing = existingRows[0];

  if (!existing) {
    return NextResponse.json({ error: "配置不存在" }, { status: 404 });
  }

  if (existing.userId !== user.userId) {
    return NextResponse.json({ error: "无权操作此配置" }, { status: 403 });
  }

  await db.delete(savedConfigs)
    .where(and(eq(savedConfigs.id, configId), eq(savedConfigs.userId, user.userId)));

  return NextResponse.json({ success: true });
}
