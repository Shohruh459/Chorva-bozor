import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Joriy foydalanuvchining sessiya JWT'i bilan ishlaydigan server klient.
 * RLS siyosatlari shu JWT ichidagi `sub` claim orqali (auth.uid()) ishlaydi.
 * Token berilmasa, cookie'dan o'qiladi; u ham bo'lmasa — anon (public) klient
 * sifatida ishlaydi (faqat status='active' e'lonlarni ko'radi).
 *
 * Bu yerdagi supabaseAnonKey — public (maxfiy bo'lmagan) kalit, shuning
 * uchun placeholder fallback xavfsiz. `accessToken` esa allaqachon
 * lib/auth.ts -> verifySessionToken orqali imzosi tekshirilgan bo'ladi
 * (bu yerda faqat Supabase'ga uzatiladi, qayta ishonch bildirilmaydi —
 * yakuniy tekshiruv har doim Supabase PostgREST tomonida, RLS orqali).
 */
export async function createServerClient(token?: string) {
  const accessToken = token ?? (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
