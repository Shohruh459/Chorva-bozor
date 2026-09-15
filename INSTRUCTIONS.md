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

## Xavfsizlik (Auth / RLS auditi)

Ushbu bo'lim Auth va RLS bo'yicha o'tkazilgan xavfsizlik auditi natijalarini
saqlaydi. Auth/RLS'ga tegishli har qanday o'zgarishdan keyin shu bo'limni
yangilang.

### JWT — qanday imzolanadi va tekshiriladi

- **Algoritm**: HS256 (simmetrik). **Secret**: Supabase loyihasining
  haqiqiy JWT Secret'i (`SUPABASE_JWT_SECRET`, Dashboard > Settings > API >
  JWT Settings) — bu **shart**, chunki xuddi shu secret bilan Supabase'ning
  o'zi ham tokenni tekshiradi va `auth.uid()`ni chiqaradi.
- **Claims**: `sub` = `users.id` (uuid), `role: "authenticated"`,
  `aud: "authenticated"`, `telegram_id`.
- **Muddat (expiry)**: **30 kun** (`setExpirationTime("30d")`,
  `lib/auth.ts`), cookie `maxAge` ham shu qiymatga sinxron
  (`SESSION_MAX_AGE_SECONDS`, `lib/constants.ts`). `jose`ning `jwtVerify`
  `exp`ni avtomatik tekshiradi — muddati o'tgan token har doim rad etiladi.
- **Refresh mexanizmi**: **yo'q, ataylab shunday tanlangan**. Muddat
  tugagach foydalanuvchi qayta Telegram orqali kirishi kerak (refresh
  token emas). Sabab — MVP uchun soddalik; 30 kun yetarlicha uzoq muddat.
  Kelajakda "sliding session" (faol foydalanuvchida muddatni avtomatik
  uzaytirish) kerak bo'lsa, alohida middleware qo'shish kerak bo'ladi.

### JWT/service-role secret — topilgan va tuzatilgan muammo

**[O'RTA — tuzatildi] Hardcode qilingan fallback secret.** Avvalgi kodda
`SUPABASE_JWT_SECRET` va `SUPABASE_SERVICE_ROLE_KEY` sozlanmasa, kod ochiq
(GitHub'da hammaga ko'rinadigan) matn qiymatlarni fallback sifatida
ishlatar edi. Bu haqiqiy Supabase'ga qarshi to'g'ridan-to'g'ri
ekspluatatsiya qilinmasa-da (Supabase o'z haqiqiy secret'i bilan
tekshiradi, fallback bilan imzolangan token'ni baribir rad etadi), yomon
amaliyot edi: xato konfiguratsiyada ilova tushunarsiz tarzda ishlamay
qolardi, o'rniga darhol aniq xato berishi kerak edi.

**Tuzatildi**: `lib/auth.ts` (`getJwtSecretKey`) va `lib/supabase/admin.ts`
(`createAdminClient`)da fallback olib tashlandi. Endi bu ikki maxfiy
qiymat sozlanmasa, **birinchi haqiqiy so'rovda** (funksiya chaqirilganda —
module yuklanganda emas, shuning uchun `next build` buzilmaydi) aniq xato
tashlanadi. `verifySessionToken` bu xatoni ushlab, `null` qaytaradi — ya'ni
sessiya tekshiruvi **fail-closed** ishlaydi: xato holatda hech kimga
noto'g'ri ruxsat berilmaydi, aksincha hamma "tizimga kirmagan" deb
hisoblanadi.

`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` uchun fallback
ataylab qoldirildi — bular **maxfiy emas** (anon key brauzerga ochiq
yuboriladigan public kalit); haqiqiy himoya RLS orqali ta'minlanadi,
kalitni yashirish orqali emas.

### Telegram Login tekshiruvi

- `lib/telegram.ts -> verifyTelegramLogin` Telegram'ning rasmiy algoritmi
  bo'yicha ishlaydi
  (`https://core.telegram.org/widgets/login#checking-authorization`):
  1. `hash`dan tashqari barcha maydonlar alifbo tartibida `key=value`
     qilib, `\n` bilan birlashtiriladi (`dataCheckString`).
  2. `secret_key = SHA256(TELEGRAM_BOT_TOKEN)`.
  3. `HMAC-SHA256(dataCheckString, secret_key)` hisoblanadi va Telegram
     yuborgan `hash` bilan **timing-safe** solishtiriladi
     (`crypto.timingSafeEqual`) — oddiy `===` emas, bu timing attack'dan
     himoyalanish uchun.
  4. `auth_date` tekshiriladi: **24 soatdan** eski so'rovlar rad etiladi
     (`MAX_AUTH_AGE_SECONDS`), kelaqchakdan kelgan sana ham (soat
     sinxronsizligi uchun ±60 soniya tolerantlik bilan) rad etiladi.
- **[KICHIK — tuzatildi]**: `hash` maydonining hex formatga mosligi endi
  qat'iy regex bilan tekshiriladi (`/^[0-9a-f]{64}$/i`) — avval faqat
  uzunlik taqqoslashga tayangan edi (amalda ekspluatatsiya qilib
  bo'lmasa-da, `Buffer.from(str, "hex")`ning noto'g'ri belgilarda jim
  qisqarish xatti-harakatidan qochish uchun kuchaytirildi).
- **[O'RTA — tuzatildi] Login-CSRF**: `/api/auth/telegram` avval `Origin`
  header'ni tekshirmas edi. Nazariy xavf: tajovuzkor o'zining haqiqiy
  (Telegram tomonidan to'g'ri imzolangan!) login ma'lumotini boshqa
  domendan (masalan, o'z saytidan) qurbon brauzeriga cross-site so'rov
  sifatida yubortirsa, qurbon o'zi sezmagan holda tajovuzkorning hisobiga
  "kirgizib qo'yilishi" mumkin edi (klassik "login CSRF"). Endi `Origin`
  header bizning domenimizga mos kelmasa, so'rov `403` bilan rad etiladi
  (`isTrustedOrigin`, `app/api/auth/telegram/route.ts`).

### RLS qoidalari — jadval bo'yicha to'liq audit

| Jadval | RLS yoqilganmi | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `public.users` | ✅ ha | faqat o'zi (`auth.uid()=id`) | ❌ yo'q (faqat service-role, ro'yxatdan o'tishda) | faqat o'zi | ❌ yo'q (hisobni o'chirish MVP'da yo'q) |
| `public.listings` | ✅ ha | `status='active'` YOKI `auth.uid()=user_id` | faqat o'zi nomidan | faqat o'zi (`USING` va `WITH CHECK` ikkalasi) | faqat o'zi |
| `storage.objects` (`listing-images`) | ✅ ha (Supabase default) | hammaga (bucket public) | faqat `auth.uid()`ga mos papka | — | faqat `auth.uid()`ga mos papka |

Tekshirildi: **RLS o'chirilib qolgan (disabled) jadval yo'q** — bu eng
ko'p uchraydigan xato turi; ikkala jadvalda ham
`alter table ... enable row level security` mavjud
(`supabase/schema.sql`, `users` va `listings` bo'limlarida).

`listings_update_own` siyosatida **ham `USING`, ham `WITH CHECK`**
`auth.uid() = user_id` bilan cheklangani muhim: `USING` foydalanuvchi
qaysi qatorlarni yangilay olishini, `WITH CHECK` esa yangilangandan
**keyingi** holat ham shu shartga mos kelishini tekshiradi — aks holda
foydalanuvchi nazariy jihatdan o'z qatorining `user_id`sini o'zgartirib,
"tashlab yuborishi" mumkin edi. Bunday zaiflik yo'q.

**Ikki qatlamli himoya (defense-in-depth)**: `PATCH`/`DELETE
/api/listings/[id]` route'lari `.eq("user_id", user.id)` filtrini ilova
darajasida ham qo'shadi — RLS'dan mustaqil ravishda. Ya'ni RLS'da
kelajakda xato bo'lsa ham, ilova darajasidagi filtr alohida himoya
beradi (va aksincha).

**Operatsion eslatma (kod emas, Supabase sozlash masalasi)**: Supabase
yangi loyihalarda asimmetrik "JWT Signing Keys" (ES256) tizimiga
o'tmoqda; eski umumiy (HS256) "JWT Secret" ba'zi yangi loyihalarda
"Legacy" deb belgilanadi. Loyihani sozlashda Dashboard > Settings > API >
JWT Settings'da **Legacy JWT Secret yoqilganini** tekshiring — aks holda
`SUPABASE_JWT_SECRET` bilan imzolangan token'lar Supabase tomonidan
tanilmay qolishi mumkin.

### Amaliy test: `scripts/test-rls.mjs`

Ikkita test foydalanuvchi (A, B) yaratadigan, A nomidan e'lon joylaydigan
va **B'ning haqiqiy sessiya tokeni bilan** (ilova ishlatadigani bilan bir
xil JWT) A'ning e'lonini UPDATE/DELETE qilishga urinadigan avtomatik test
yozildi (`npm run test:rls`). Tekshiradi:

1. A o'z nomidan e'lon yarata oladi (musbat)
2. **B, A'ning e'lonini UPDATE qila olmaydi** (0 qator o'zgaradi — xato
   emas, chunki PostgREST RLS bilan bloklaganda xato qaytarmaydi, shunchaki
   hech qanday qator WHERE+RLS shartiga mos kelmaydi)
3. Admin klient bilan tasdiqlanadi: sarlavha haqiqatda o'zgarmagan
4. **B, A'ning e'lonini DELETE qila olmaydi** (0 qator o'chadi)
5. Admin klient bilan tasdiqlanadi: e'lon hali ham bazada mavjud
6. A o'z e'lonini UPDATE qila oladi (musbat)
7. Anonim foydalanuvchi `status='removed'` e'lonni ko'rmaydi
8. B, `users` jadvalidan A'ning qatorini o'qiy olmaydi

**MUHIM — ochiq va halol eslatma**: bu skript **shu audit davomida ishga
tushirilmadi**, chunki joriy (sandbox) muhitda haqiqiy Supabase loyihasi
yo'q (faqat placeholder `.env`) va Docker daemon ham ishlamaydi
(tekshirildi: `docker ps` — "no such file or directory"), shuning uchun
lokal Supabase stack ham ko'tarib bo'lmadi. Skript faqat sintaksis
jihatdan tekshirildi (`node --check scripts/test-rls.mjs` — xatosiz) va
yuqoridagi RLS siyosatlarini qo'lda kod orqali tahlil qilish asosida
to'g'ri ishlashi **kutiladi**, lekin bu **haqiqiy ishga tushirilgan test
natijasi emas**. Supabase loyihasini sozlagach, **albatta** ishga
tushiring:

```bash
npm run test:rls
# teng: node --env-file=.env.local scripts/test-rls.mjs
```

Agar biror band ❌ bilan tugasa (ayniqsa 2- yoki 4-band — ya'ni B, A'ning
e'lonini o'zgartira/o'chira olsa), bu RLS siyosatlari noto'g'ri
qo'llanganini bildiradi (masalan, `supabase/schema.sql` to'liq ishga
tushirilmagan yoki policy'lar Dashboard'da qo'lda o'zgartirilgan) — darhol
Supabase Dashboard > Authentication > Policies'ni tekshiring va bu faylni
qayta ishga tushiring.

### Cookie xavfsizligi

`cb_session` cookie: `httpOnly: true` (JS'dan o'qib bo'lmaydi, XSS orqali
o'g'irlash qiyinlashadi), `secure: true` (faqat production'da, HTTPS
talab qiladi), `sameSite: "lax"` (cross-site POST/PATCH/DELETE
so'rovlarda cookie yuborilmaydi — bu boshqa yozish endpoint'lari
(`/api/listings`, `/api/upload` va h.k.) uchun CSRF'ga qarshi asosiy
himoya; ular uchun alohida CSRF token qo'shilmagan, chunki `SameSite=Lax`
yetarli darajada himoya qiladi).

### Xulosa — topilgan muammolar ro'yxati (jiddiylik bo'yicha)

| # | Jiddiylik | Muammo | Holat |
|---|---|---|---|
| 1 | O'rta | JWT secret / service-role key uchun hardcode fallback | ✅ Tuzatildi |
| 2 | O'rta | `/api/auth/telegram`'da login-CSRF (Origin tekshiruvi yo'q edi) | ✅ Tuzatildi |
| 3 | Kichik | Telegram `hash` formatini qat'iy tekshirmaslik | ✅ Tuzatildi |
| 4 | Past | Telegram login payload'ini 24 soat ichida qayta yuborish (replay) mumkin | Bilib turilgan cheklov — Widget'ning o'zida bor, HTTPS majburiy bo'lsa xavf past; alohida tuzatilmadi |
| 5 | Ma'lumot | RLS o'chirilgan jadval bormi | ✅ Yo'q, tekshirildi |
| 6 | Ma'lumot | `listings`/`users` SELECT/UPDATE/DELETE siyosatlari to'g'riligi | ✅ To'g'ri, tekshirildi (jadvalga qarang) |
| 7 | Ma'lumot | Amaliy A/B cross-user testi | ✍️ Yozildi, lekin **hali ishga tushirilmagan** — Supabase sozlagach ishga tushiring |

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
scripts/test-rls.mjs             — RLS xavfsizlik testi (npm run test:rls)
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
