import { createClient } from "@supabase/supabase-js";

// Brauzerda va public (auth talab qilmaydigan) server komponentlarida
// ishlatiladigan klient. Faqat anon key bilan ishlaydi — RLS orqali
// faqat status='active' bo'lgan e'lonlarni o'qishga ruxsat beradi.
// Build vaqtida .env mavjud bo'lmasa ham xato bermasligi uchun
// placeholder qiymatlar bilan fallback qilinadi (runtime'da haqiqiy
// so'rov ketganda .env sozlangan bo'lishi shart).
//
// Xavfsizlik eslatmasi: anon key — MAXFIY KALIT EMAS, u brauzerga
// ataylab yuboriladigan public kalit (nomidan ham ko'rinib turibdi).
// Shuning uchun bu yerda placeholder fallback xavfsiz — haqiqiy
// himoya RLS siyosatlari orqali ta'minlanadi, kalitni yashirish orqali
// emas. SUPABASE_JWT_SECRET va SUPABASE_SERVICE_ROLE_KEY esa MAXFIY —
// ular uchun fallback yo'q (lib/auth.ts, lib/supabase/admin.ts'ga qarang).
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
