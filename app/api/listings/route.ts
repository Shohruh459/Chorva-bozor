import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSessionCookieValue } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import type { Category } from "@/types";

interface CreateListingBody {
  category: Category;
  title: string;
  description?: string;
  price: number;
  region: string;
  district: string;
  phone: string;
  images: string[];
  details: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
  }

  let body: CreateListingBody;
  try {
    body = (await request.json()) as CreateListingBody;
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  if (!body.category || !["livestock", "feed"].includes(body.category)) {
    return NextResponse.json({ error: "Kategoriya noto'g'ri" }, { status: 400 });
  }
  if (!body.title?.trim() || !body.region || !body.district || !body.phone?.trim()) {
    return NextResponse.json(
      { error: "Majburiy maydonlar to'ldirilmagan" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(body.price) || body.price < 0) {
    return NextResponse.json({ error: "Narx noto'g'ri" }, { status: 400 });
  }

  const token = await getSessionCookieValue();
  const supabase = await createServerClient(token);

  const { data, error } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      category: body.category,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      price: body.price,
      region: body.region,
      district: body.district,
      phone: body.phone.trim(),
      telegram_username: user.telegram_username,
      images: body.images ?? [],
      details: body.details ?? {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listing: data });
}
