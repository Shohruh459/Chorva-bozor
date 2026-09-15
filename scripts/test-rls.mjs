#!/usr/bin/env node
/**
 * RLS xavfsizlik testi (Auth/RLS auditi doirasida yozilgan).
 *
 * Ikkita test foydalanuvchi (A va B) yaratadi, A nomidan e'lon joylaydi,
 * so'ng B'ning tokeni bilan A'ning e'lonini UPDATE/DELETE qilishga
 * urinadi va bu urinishlar RLS tomonidan bloklanishini tasdiqlaydi.
 * Musbat testlar ham bor: A o'z e'lonini o'zgartira oladi, anonim
 * foydalanuvchi 'removed' statusli e'lonni ko'rmaydi.
 *
 * TALAB QILINADI: haqiqiy (bo'sh bo'lsa ham) Supabase loyihasi va to'liq
 * sozlangan .env.local (supabase/schema.sql ishga tushirilgan bo'lishi
 * shart). Bu skript build/CI vaqtida avtomatik ishlamaydi — u faqat
 * haqiqiy Supabase muhitiga qarshi qo'lda ishga tushiriladi:
 *
 *   node --env-file=.env.local scripts/test-rls.mjs
 *
 * (Eski Node versiyalarida --env-file yo'q bo'lsa:
 *   export $(grep -v '^#' .env.local | xargs) && node scripts/test-rls.mjs)
 *
 * Skript o'zi yaratgan test yozuvlarini (users/listings) oxirida har
 * doim (xato bo'lsa ham) o'chirib tashlaydi.
 */

import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET,
} = process.env;

function requireEnv(name, value) {
  if (!value) {
    console.error(
      `Xato: ${name} topilmadi. Bu test haqiqiy Supabase loyihasi va ` +
        `to'liq sozlangan .env.local'ni talab qiladi (INSTRUCTIONS.md'ga qarang).`
    );
    process.exit(1);
  }
  return value;
}

requireEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
requireEnv("SUPABASE_JWT_SECRET", SUPABASE_JWT_SECRET);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const secretKey = new TextEncoder().encode(SUPABASE_JWT_SECRET);

// DIQQAT: bu funksiya lib/auth.ts -> signSessionToken bilan bir xil
// bo'lishi kerak (claims tarkibi). Ikkalasi qo'lda sinxronda saqlanadi —
// agar u yerda o'zgartirsangiz, shu yerni ham yangilang.
async function signSessionToken(userId, telegramId) {
  return new SignJWT({ telegram_id: telegramId, role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .setAudience("authenticated")
    .sign(secretKey);
}

function clientAs(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.log(`  ❌ ${label}`);
    if (detail) console.log(`     -> ${detail}`);
    failures++;
  }
}

function randomTelegramId() {
  return 900_000_000_000 + Math.floor(Math.random() * 90_000_000);
}

let userA = null;
let userB = null;
let listing = null;

try {
  console.log("1) Test foydalanuvchilarni yaratish (A va B)...");

  const { data: a, error: aErr } = await admin
    .from("users")
    .insert({ telegram_id: randomTelegramId(), name: "RLS audit — User A" })
    .select()
    .single();
  if (aErr) throw new Error(`User A yaratilmadi: ${aErr.message}`);
  userA = a;

  const { data: b, error: bErr } = await admin
    .from("users")
    .insert({ telegram_id: randomTelegramId(), name: "RLS audit — User B" })
    .select()
    .single();
  if (bErr) throw new Error(`User B yaratilmadi: ${bErr.message}`);
  userB = b;

  console.log(`   User A: ${userA.id}`);
  console.log(`   User B: ${userB.id}`);

  const tokenA = await signSessionToken(userA.id, userA.telegram_id);
  const tokenB = await signSessionToken(userB.id, userB.telegram_id);
  const asA = clientAs(tokenA);
  const asB = clientAs(tokenB);

  console.log("\n2) User A o'z nomidan e'lon yaratadi (INSERT)...");
  const { data: created, error: createErr } = await asA
    .from("listings")
    .insert({
      user_id: userA.id,
      category: "livestock",
      title: "RLS audit test e'loni",
      price: 1000000,
      region: "Toshkent shahri",
      district: "Chilonzor",
      phone: "+998900000000",
    })
    .select()
    .single();
  check(
    "A o'z nomidan e'lon yarata oladi",
    !createErr && !!created,
    createErr?.message
  );
  if (createErr || !created) {
    throw new Error("E'lon yaratilmagani uchun keyingi testlar o'tkazib yuborildi");
  }
  listing = created;

  console.log("\n3) User B, A'ning e'lonini UPDATE qilishga urinadi...");
  const { data: updateAttempt, error: updateErr } = await asB
    .from("listings")
    .update({ title: "B tomonidan bosib olindi!" })
    .eq("id", listing.id)
    .select();
  // RLS bloklaganda PostgREST xato QAYTARMAYDI — shunchaki 0 ta qator
  // ta'sirlanadi (WHERE + RLS filtri hech narsaga mos kelmaydi).
  check(
    "B, A'ning e'lonini UPDATE qila olmaydi (0 qator o'zgardi)",
    !updateErr && Array.isArray(updateAttempt) && updateAttempt.length === 0,
    updateErr
      ? updateErr.message
      : `qaytgan qatorlar: ${updateAttempt?.length ?? "noma'lum"}`
  );

  const { data: afterUpdate } = await admin
    .from("listings")
    .select("title")
    .eq("id", listing.id)
    .single();
  check(
    "E'lon sarlavhasi haqiqatda o'zgarmagan (admin bilan tekshirildi)",
    afterUpdate?.title === listing.title,
    `hozirgi sarlavha: "${afterUpdate?.title}"`
  );

  console.log("\n4) User B, A'ning e'lonini DELETE qilishga urinadi...");
  const { data: deleteAttempt, error: deleteErr } = await asB
    .from("listings")
    .delete()
    .eq("id", listing.id)
    .select();
  check(
    "B, A'ning e'lonini DELETE qila olmaydi (0 qator o'chdi)",
    !deleteErr && Array.isArray(deleteAttempt) && deleteAttempt.length === 0,
    deleteErr
      ? deleteErr.message
      : `o'chirilgan qatorlar: ${deleteAttempt?.length ?? "noma'lum"}`
  );

  const { data: stillExists } = await admin
    .from("listings")
    .select("id")
    .eq("id", listing.id)
    .maybeSingle();
  check(
    "E'lon hali ham bazada mavjud (admin bilan tekshirildi)",
    !!stillExists
  );

  console.log(
    "\n5) (Musbat test) User A o'z e'lonini UPDATE qila oladi..."
  );
  const { data: ownUpdate, error: ownUpdateErr } = await asA
    .from("listings")
    .update({ title: "A tomonidan yangilandi" })
    .eq("id", listing.id)
    .select();
  check(
    "A o'z e'lonini muvaffaqiyatli UPDATE qiladi",
    !ownUpdateErr && ownUpdate?.length === 1,
    ownUpdateErr?.message
  );

  console.log(
    "\n6) (Musbat test) Anonim foydalanuvchi 'removed' e'lonni ko'rmaydi..."
  );
  await admin.from("listings").update({ status: "removed" }).eq("id", listing.id);
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: anonSeesRemoved } = await anon
    .from("listings")
    .select("id")
    .eq("id", listing.id)
    .maybeSingle();
  check(
    "Anonim foydalanuvchi 'removed' statusli e'lonni ko'rmaydi",
    !anonSeesRemoved
  );

  console.log(
    "\n7) (Musbat test) User B, users jadvalidan User A qatorini o'qiy olmaydi..."
  );
  const { data: bReadsA } = await asB
    .from("users")
    .select("*")
    .eq("id", userA.id)
    .maybeSingle();
  check("B, A'ning users qatorini o'qiy olmaydi", !bReadsA);
} catch (err) {
  console.error("\nKutilmagan xato:", err instanceof Error ? err.message : err);
  failures++;
} finally {
  console.log("\n8) Tozalash (test yozuvlarini o'chirish)...");
  if (listing) await admin.from("listings").delete().eq("id", listing.id);
  if (userA) await admin.from("users").delete().eq("id", userA.id);
  if (userB) await admin.from("users").delete().eq("id", userB.id);
  console.log("   Tayyor.");
}

console.log("\n" + "=".repeat(60));
if (failures === 0) {
  console.log("✅ BARCHA TESTLAR O'TDI — RLS kutilganidek ishlayapti.");
  process.exit(0);
} else {
  console.log(
    `❌ ${failures} TA TEST MUVAFFAQIYATSIZ TUGADI — RLS siyosatlarini darhol tekshiring!`
  );
  process.exit(1);
}
