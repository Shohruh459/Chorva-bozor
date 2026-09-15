import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types";

/**
 * DIQQAT (xavfsizlik): bu yerda hardcode qilingan fallback secret
 * ATAYLAB ishlatilmaydi. Agar SUPABASE_JWT_SECRET .env'da bo'lmasa,
 * runtime'da (birinchi so'rov kelganda) aniq xato tashlanadi — bu
 * `next build`ni buzmaydi, chunki qiymat faqat funksiya chaqirilganda
 * (request vaqtida) o'qiladi, module yuklanganda emas.
 */
function getJwtSecretKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET .env'da sozlanmagan. Bu Supabase RLS bilan " +
        "ishlash uchun majburiy (Dashboard > Settings > API > JWT Settings)."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // users.id
  telegram_id: number;
}

/**
 * Supabase RLS'dagi auth.uid() bilan mos ishlashi uchun JWT
 * Supabase loyihasining JWT Secret'i bilan imzolanadi va
 * `sub` (=users.id), `role=authenticated`, `aud=authenticated`
 * claim'larini o'z ichiga oladi.
 */
export async function signSessionToken(params: {
  userId: string;
  telegramId: number;
}): Promise<string> {
  return new SignJWT({
    telegram_id: params.telegramId,
    role: "authenticated",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .setAudience("authenticated")
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      audience: "authenticated",
    });
    if (!payload.sub || payload.telegram_id === undefined) return null;
    return {
      sub: payload.sub,
      telegram_id: Number(payload.telegram_id),
    };
  } catch {
    return null;
  }
}

export async function getSessionCookieValue(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

/** Joriy so'rovdagi foydalanuvchini (cookie orqali) qaytaradi, aks holda null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const token = await getSessionCookieValue();
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const supabase = await createServerClient(token);
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.sub)
    .single();

  if (error || !data) return null;
  return data as AppUser;
}

/** Faqat ADMIN_TELEGRAM_ID'ga mos foydalanuvchi uchun user obyektini qaytaradi. */
export async function requireAdmin(): Promise<AppUser | null> {
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminTelegramId) return null;

  const user = await getCurrentUser();
  if (!user) return null;
  if (String(user.telegram_id) !== String(adminTelegramId)) return null;

  return user;
}
