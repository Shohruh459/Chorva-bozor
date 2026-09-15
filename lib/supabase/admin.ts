import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";

/**
 * DIQQAT: faqat server tomonida (API route handler) ishlating.
 * Bu klient RLS'ni butunlay chetlab o'tadi — Telegram orqali ro'yxatdan
 * o'tish (JWT hali yo'q paytda users jadvaliga yozish) va admin panel
 * operatsiyalari (boshqa foydalanuvchi e'lonini o'chirish) uchun kerak.
 *
 * Xavfsizlik: SUPABASE_SERVICE_ROLE_KEY uchun hardcode fallback ATAYLAB
 * ishlatilmaydi (bu kalit RLS'ni to'liq chetlab o'tadi — eng imtiyozli
 * kalit). Sozlanmagan bo'lsa, chaqirilgan joyda (request vaqtida) aniq
 * xato tashlanadi — `next build`ga ta'sir qilmaydi.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient faqat serverda ishlatilishi kerak");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY .env'da sozlanmagan (Dashboard > Settings > API)."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
