-- Chorva Bozor — MVP database schema
-- Supabase (Postgres) uchun. Bu faylni Supabase loyihangizda
-- SQL Editor orqali to'liq nusxalab ishga tushiring.
--
-- ESLATMA (auth haqida): loyihada Supabase Auth (email/OAuth) ishlatilmaydi.
-- O'rniga Telegram Login Widget orqali tekshirilgan foydalanuvchi uchun
-- backend (app/api/auth/telegram) loyihaning SUPABASE_JWT_SECRET'i bilan
-- imzolangan JWT yaratadi (claims: sub=users.id, role=authenticated).
-- Shu JWT keyin supabase-js so'rovlarida Authorization header sifatida
-- yuboriladi va quyidagi RLS siyosatlaridagi auth.uid() aynan shu
-- sub qiymatini qaytaradi. Batafsil: INSTRUCTIONS.md.

create extension if not exists "pgcrypto";

-- ==========================================================
-- USERS
-- ==========================================================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  telegram_username text,
  name text not null,
  phone text,
  region text,
  district text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Foydalanuvchi faqat o'z profilini ko'ra/o'zgartira oladi.
-- (Ro'yxatdan o'tishda yozuv backend'da service-role kalit bilan,
--  RLS'ni chetlab o'tib amalga oshiriladi — chunki JWT hali mavjud emas.)
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ==========================================================
-- LISTINGS (e'lonlar) — polimorfik: category + JSONB details
-- ==========================================================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category in ('livestock', 'feed')),
  title text not null,
  description text,
  price numeric(14, 2) not null check (price >= 0),
  region text not null,
  district text not null,
  phone text not null,
  telegram_username text,
  images text[] not null default '{}',
  -- livestock: { "turi": "mol", "yoshi": 12, "jinsi": "urgochi", "soni": 1 }
  -- feed:      { "turi": "pichan", "ogirligi": 500, "birligi": "kg" }
  details jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_region_idx on public.listings (region, district);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_user_idx on public.listings (user_id);
create index if not exists listings_created_idx on public.listings (created_at desc);

alter table public.listings enable row level security;

-- Hammaga (anon foydalanuvchiga ham) faol e'lonlar ko'rinadi;
-- egasi esa o'zining barcha (sold/removed) e'lonlarini ham ko'radi.
create policy "listings_select_public_or_own" on public.listings
  for select using (status = 'active' or auth.uid() = user_id);

create policy "listings_insert_own" on public.listings
  for insert with check (auth.uid() = user_id);

create policy "listings_update_own" on public.listings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "listings_delete_own" on public.listings
  for delete using (auth.uid() = user_id);

-- Admin panel operatsiyalari (boshqa foydalanuvchi e'lonini o'chirish/
-- moderatsiya) backend'da SUPABASE_SERVICE_ROLE_KEY bilan, RLS'ni chetlab
-- o'tib bajariladi. Admin ekanligi ADMIN_TELEGRAM_ID orqali tekshiriladi
-- (lib/auth.ts -> requireAdmin()).

-- ==========================================================
-- updated_at avtomatik yangilanishi
-- ==========================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ==========================================================
-- STORAGE — e'lon rasmlari uchun bucket
-- ==========================================================
-- Supabase Dashboard > Storage bo'limida "listing-images" nomli PUBLIC
-- bucket yarating (yoki quyidagi qatorni SQL Editor'da ishga tushiring):
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Hamma rasmni ko'ra oladi (bucket public), lekin faqat tizimga kirgan
-- foydalanuvchi (bizning JWT'imiz bilan) fayl yuklay oladi, va faqat
-- o'ziga tegishli papkaga (path birinchi bo'lagi = auth.uid()).
create policy "listing_images_public_read" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "listing_images_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'listing-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
