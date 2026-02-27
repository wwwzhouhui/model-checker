import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { savedConfigs } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { encryptApiKey, maskApiKey, decryptApiKey } from "@/lib/crypto";

/** GET /api/configs - 获取当前用户配置列表 */
export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = db
    .select()
    .from(savedConfigs)
    .where(eq(savedConfigs.userId, user.userId))
    .all();

  const configs = rows.map((row) => ({
    id: row.id,
    name: row.name,
    base_url: row.baseUrl,
    api_key_masked: maskApiKey(decryptApiKey(row.apiKeyEnc)),
    provider: row.provider ?? "openai",
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }));

  return NextResponse.json({ configs });
}

/** POST /api/configs - 新增配置 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, base_url, api_key, provider } = body as {
    name?: string;
    base_url?: string;
    api_key?: string;
    provider?: string;
  };

  if (!name || !api_key) {
    return NextResponse.json(
      { error: "name、api_key 均为必填项" },
      { status: 400 }
    );
  }

  const db = getDb();
  const apiKeyEnc = encryptApiKey(api_key);

  const result = db
    .insert(savedConfigs)
    .values({
      userId: user.userId,
      name,
      baseUrl: base_url ?? "",
      apiKeyEnc,
      provider: provider ?? "openai",
    })
    .returning()
    .get();

  return NextResponse.json(
    {
      config: {
        id: result.id,
        name: result.name,
        base_url: result.baseUrl,
        api_key_masked: maskApiKey(api_key),
        provider: result.provider ?? "openai",
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      },
    },
    { status: 201 }
  );
}
