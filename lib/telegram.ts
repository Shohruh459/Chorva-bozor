import crypto from "node:crypto";
import type { TelegramLoginPayload } from "@/types";

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24; // 1 kun

/**
 * Telegram Login Widget yuborgan ma'lumotni tekshiradi.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(
  payload: TelegramLoginPayload
): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const { hash, ...rest } = payload;
  // Hex formatini qat'iy tekshiramiz — Buffer.from(str, "hex") noto'g'ri
  // belgilarda jim tarzda qisqargan buffer qaytaradi, shuning uchun uzunlik
  // solishtiruvidan oldin format haqida aniq bo'lish kerak (defense-in-depth;
  // pastdagi uzunlik tekshiruvi baribir himoya qiladi, lekin bu aniqroq).
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return false;

  const dataCheckString = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const computedBuf = Buffer.from(computedHash, "hex");
  const receivedBuf = Buffer.from(hash, "hex");
  if (
    computedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(computedBuf, receivedBuf)
  ) {
    return false;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - payload.auth_date;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS || ageSeconds < -60) {
    return false;
  }

  return true;
}
