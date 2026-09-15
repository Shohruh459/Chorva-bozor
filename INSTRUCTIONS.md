# Chorva Bozor — INSTRUCTIONS

MVP: O'zbekiston uchun chorva mol-holi va yem-xashak e'lonlari marketplace'i.
Bu fayl arxitektura qarorlarini, DB sxemasini va keyingi qadamlarni saqlaydi.
**Har bir muhim o'zgarishdan keyin shu faylni yangilab boring.**

## Texnik stack

- **Frontend**: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS
- **Backend/DB**: Supabase (Postgres + Storage). Supabase Auth ishlatilmaydi.
- **Deploy**: oddiy Next.js build (`npm run build && npm run start`) — VPS +
  Nginx + Cloudflare orqali joylashtirish uchun mos. Maxsus platforma
  (Vercel-only funksiyalar) ishlatilmagan.
- **Auth**: Telegram Login Widget, parolsiz.

## Arxitektura qarorlari

### 1. Auth — nega Supabase Auth emas, custom JWT?

Supabase Auth email/OAuth provayderlarga mo'ljallangan, Telegram uchun
tayyor provayder yo'q. Shuning uchun:

1. Foydalanuvchi Telegram Login Widget orqali kiradi (`/kirish` sahifasi,
   `components/TelegramLoginButton.tsx`).
2. Telegram yuborgan ma'lumot (`id, first_name, hash, auth_date, ...`)
   `POST /api/auth/telegram`'ga boradi.
3. Backend HMAC-SHA256 orqali hash'ni tekshiradi (`lib/telegram.ts`,
   Telegram'ning rasmiy algoritmi — `TELEGRAM_BOT_TOKEN` kerak).
4. Tekshiruvdan o'tsa, `users` jadvalida foydalanuvchi topiladi/yaratiladi
   (service-role klient bilan, RLS chetlab o'tiladi — chunki JWT hali yo'q).
5. **Supabase loyihasining `SUPABASE_JWT_SECRET`i bilan** o'zimiz JWT
   imzolaymiz: `{ sub: users.id, role: "authenticated", aud: "authenticated" }`
   (`lib/auth.ts -> signSessionToken`). Bu — Supabase'ning "custom auth bilan
   RLS ishlatish" rasmiy patterni.
6. JWT httpOnly cookie'ga (`cb_session`) yoziladi.
7. Keyingi har bir so'rovda bu JWT `Authorization: Bearer` header sifatida
   Supabase'ga yuboriladi (`lib/supabase/server.ts -> createServerClient`) —
   shu orqali Postgres RLS ichidagi `auth.uid()` aynan `users.id`ni qaytaradi.

**Xulosa**: brauzer hech qachon Supabase'ga to'g'ridan-to'g'ri **yozmaydi**.
Yozish (create/update/delete/upload) doim Next.js API route orqali, server
tomonda JWT bilan ishlaydi. Brauzer faqat **public o'qish** uchun (bosh
sahifa, e'lon detali) anon key bilan to'g'ridan-to'g'ri Supabase'ga
so'rov yuboradi — bu xavfsiz, chunki RLS faqat `status='active'` e'lonlarni
ko'rsatadi.

### 2. Ma'lumotlar bazasi — polimorfik `listings` jadvali

`listings` jadvalida umumiy maydonlar (narx, hudud, rasm, telefon, ...) va
kategoriyaga xos maydonlar uchun bitta `details JSONB` ustuni bor:

- `category='livestock'`: `{ turi, yoshi, jinsi, soni }`
- `category='feed'`: `{ turi, ogirligi, birligi }`

Kelajakda yangi bo'lim (masalan, veterinar xizmatlari) qo'shilganda,
jadval qayta qurilmasin — yangi `category` qiymati va mos `details` shakli
qo'shish kifoya. To'liq sxema: `supabase/schema.sql`.

### 3. RLS siyosatlari (qisqacha)

- `listings`: hamma `status='active'` yozuvlarni o'qiy oladi; egasi o'z
  yozuvini (har qanday holatda) o'qiy/yaratadi/o'zgartiradi/o'chira oladi.
- `users`: faqat o'zini ko'radi/o'zgartiradi.
- `storage.objects` (`listing-images` bucket): hammaga public o'qish;
  yozish faqat `auth.uid()`ga mos papkaga (`{user_id}/...`).
- Admin operatsiyalari (boshqa birovning e'lonini o'chirish) RLS'ni
  chetlab o'tadi — `SUPABASE_SERVICE_ROLE_KEY` bilan, faqat
  `ADMIN_TELEGRAM_ID`ga mos foydalanuvchi uchun (`lib/auth.ts -> requireAdmin`).

### 4. Nega Next.js 16?

Boshida Next.js 14.2.15 bilan boshlangan edi, lekin `npm install` paytida
u yerda **kritik** xavfsizlik zaifligi (RCE va bir qancha DoS/SSRF)
borligi aniqlandi (`npm audit`). Shuning uchun darhol xavfsiz Next.js
16.3.5'ga o'tildi. Bu versiyada `cookies()` va sahifa `params`/`searchParams`
**async** (Promise) — kodda hamma joyda shunga moslashtirilgan
(`await cookies()`, `await params` va h.k.). ESLint ham 9'ga ko'tarildi
(`eslint-config-next@16` shuni talab qiladi), flat config: `eslint.config.mjs`.

## Loyiha strukturasi

```
app/
  page.tsx                     — bosh sahifa (kategoriya tab + filtr + ro'yxat)
  layout.tsx, globals.css
  elon/[id]/page.tsx            — e'lon detali
  elon/yangi/page.tsx           — yangi e'lon (auth talab qiladi)
  elon/tahrirlash/[id]/page.tsx — e'lonni tahrirlash (faqat egasi)
  profil/page.tsx               — "Mening e'lonlarim"
  kirish/page.tsx                — Telegram Login
  admin/page.tsx                 — admin panel (faqat ADMIN_TELEGRAM_ID)
  api/
    auth/telegram/route.ts      — Telegram tekshiruv + JWT cookie
    auth/logout/route.ts
    listings/route.ts           — POST (yaratish)
    listings/[id]/route.ts      — PATCH/DELETE (faqat egasi, RLS orqali)
    upload/route.ts             — rasm yuklash (Supabase Storage)
    admin/listings/[id]/route.ts — DELETE (faqat admin)
components/                     — UI komponentlar (Header, ListingForm, ...)
lib/
  supabase/publicClient.ts      — anon key, faqat public o'qish
  supabase/server.ts            — JWT bilan authenticated klient
  supabase/admin.ts             — service-role klient (faqat server, RLS'siz)
  auth.ts                       — JWT sign/verify, getCurrentUser, requireAdmin
  telegram.ts                   — Telegram Login Widget hash tekshiruvi
  regions.ts                    — O'zbekiston viloyat/tuman ro'yxati
  constants.ts, utils.ts
types/index.ts                  — Listing, AppUser va h.k. TS tiplari
supabase/schema.sql              — to'liq DB sxema + RLS + storage siyosati
```

## .env o'zgaruvchilari (`.env.example`'ga qarang, haqiqiy qiymat yo'q)

| O'zgaruvchi | Qayerdan olinadi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API (**maxfiy!**) |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard > Settings > API > JWT Settings |
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | @BotFather bilan yaratgan bot username'i |
| `ADMIN_TELEGRAM_ID` | O'zingizning Telegram raqamli ID'ingiz (masalan, @userinfobot orqali) |

## Birinchi marta ishga tushirish

1. Supabase'da yangi loyiha yarating.
2. `supabase/schema.sql`ni Supabase SQL Editor'da to'liq ishga tushiring
   (jadvallar, RLS, `listing-images` storage bucket shu yerda yaratiladi).
3. @BotFather orqali bot yarating, `/setdomain` bilan saytingiz domenini
   ulang (Telegram Login Widget domensiz ishlamaydi — lokal test uchun
   ngrok/tunnel yoki Telegram'ning localhost istisnosidan foydalaning).
4. `.env.example`ni `.env.local`ga nusxalab, haqiqiy qiymatlarni kiriting.
5. `npm install && npm run dev`.

`npm run build` Supabase sozlanmagan holda ham xatosiz o'tadi (placeholder
qiymatlar bilan) — bosh sahifa "Supabase hali sozlanmagan" degan xabar
ko'rsatadi, ilova qulamaydi.

## Tekshirildi

- `npm run build` — ✅ xatosiz (8 ta route: 1 sahifa + 6 sahifa + API'lar)
- `npm run lint` — ✅ xatosiz
- `npm run dev` + smoke test (`/`, `/kirish`, `/admin`) — ✅ 200, kutilgan
  matnlar bilan render bo'ladi (Supabase ulanmagan holatda ham qulamaydi)

## MVP'ga kirmagan (keyingi bosqich)

- Veterinar bo'limi
- Reyting/sharh tizimi
- Google Play / TWA
- To'lov/premium e'lon
- Push-bildirishnoma
- Telegram Mini App (WebApp SDK) — hozir faqat Telegram Login Widget (web)

## Ma'lum cheklovlar / keyingi e'tibor talab qiladigan narsalar

- Rasm o'chirilganda (`removeExistingImage`) hozircha faqat `listings.images`
  massividan olib tashlanadi, Supabase Storage'dagi fayl fizik o'chmaydi —
  vaqt o'tishi bilan Storage'da "yetim" fayllar yig'iladi. Keyingi bosqichda
  cron/edge function bilan tozalash qo'shish mumkin.
- Telefon raqam formati validatsiya qilinmagan (faqat "bo'sh emas"
  tekshiriladi) — kerak bo'lsa `+998XXXXXXXXX` regex qo'shiladi.
- E'lonlar ro'yxati sahifalanmagan (pagination yo'q) — e'lonlar soni
  ko'payganda qo'shish kerak.
