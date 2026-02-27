import crypto from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY || "0".repeat(64);
const KEY = Buffer.from(KEY_HEX, "hex");

/**
 * AES-256-GCM 加密
 * 返回格式：`iv:authTag:ciphertext`（均为 base64）
 */
export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * AES-256-GCM 解密
 * 输入格式：`iv:authTag:ciphertext`（均为 base64）
 */
export function decryptApiKey(encrypted: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}

/**
 * API Key 脱敏：显示末 4 位，其余替换为 ****
 * 例：sk-abcd1234  →  sk-****1234
 */
export function maskApiKey(plaintext: string): string {
  if (plaintext.length <= 4) {
    return "****";
  }
  const visible = plaintext.slice(-4);
  const prefix = plaintext.slice(0, plaintext.length - 4);
  // 保留前缀可识别部分（如 "sk-"），其余替换为 ****
  const dashIdx = prefix.lastIndexOf("-");
  if (dashIdx !== -1) {
    return prefix.slice(0, dashIdx + 1) + "****" + visible;
  }
  return "****" + visible;
}
