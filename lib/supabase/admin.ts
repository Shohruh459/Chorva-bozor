import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

/**
 * DIQQAT: faqat server tomonida (API route handler) ishlating.
 * Bu klient RLS'ni butunlay chetlab o'tadi — Telegram orqali ro'yxatdan
 * o'tish (JWT hali yo'q paytda users jadvaliga yozish) va admin panel
 * operatsiyalari (boshqa foydalanuvchi e'lonini o'chirish) uchun kerak.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient faqat serverda ishlatilishi kerak");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
