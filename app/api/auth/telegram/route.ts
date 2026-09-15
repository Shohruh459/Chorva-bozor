import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramLogin } from "@/lib/telegram";
import { signSessionToken } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import type { TelegramLoginPayload } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: TelegramLoginPayload;
  try {
    body = (await request.json()) as TelegramLoginPayload;
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  if (!verifyTelegramLogin(body)) {
    return NextResponse.json(
      { error: "Telegram tekshiruvi muvaffaqiyatsiz tugadi" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const fullName =
    [body.first_name, body.last_name].filter(Boolean).join(" ").trim() ||
    body.username ||
    `Foydalanuvchi ${body.id}`;

  const { data: user, error } = await admin
    .from("users")
    .upsert(
      {
        telegram_id: body.id,
        telegram_username: body.username ?? null,
        name: fullName,
      },
      { onConflict: "telegram_id" }
    )
    .select()
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: "Foydalanuvchini saqlab bo'lmadi" },
      { status: 500 }
    );
  }

  const token = await signSessionToken({
    userId: user.id,
    telegramId: user.telegram_id,
  });

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
