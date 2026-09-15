import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSessionCookieValue } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

const ALLOWED_FIELDS = [
  "title",
  "description",
  "price",
  "region",
  "district",
  "phone",
  "images",
  "details",
  "status",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "O'zgartiriladigan maydon yo'q" }, { status: 400 });
  }

  const token = await getSessionCookieValue();
  const supabase = await createServerClient(token);

  const { data, error } = await supabase
    .from("listings")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "E'lon topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ listing: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
  }

  const token = await getSessionCookieValue();
  const supabase = await createServerClient(token);

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
