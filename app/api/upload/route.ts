import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser, getSessionCookieValue } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { LISTING_IMAGES_BUCKET, MAX_LISTING_IMAGES } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
  }
  if (files.length > MAX_LISTING_IMAGES) {
    return NextResponse.json(
      { error: `Maksimal ${MAX_LISTING_IMAGES} ta rasm yuklash mumkin` },
      { status: 400 }
    );
  }

  const token = await getSessionCookieValue();
  const supabase = await createServerClient(token);

  const urls: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Faqat rasm fayllari qabul qilinadi" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { error: `Rasm yuklashda xato: ${error.message}` },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return NextResponse.json({ urls });
}
