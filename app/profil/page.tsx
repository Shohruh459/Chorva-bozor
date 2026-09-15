import { redirect } from "next/navigation";
import { getCurrentUser, getSessionCookieValue } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import MyListingsList from "@/components/MyListingsList";
import type { Listing } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/kirish?next=/profil");

  const token = await getSessionCookieValue();
  const supabase = await createServerClient(token);
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const listings = (data as Listing[]) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900">Mening e&apos;lonlarim</h1>
      <p className="mt-1 text-sm text-gray-500">{user.name}, xush kelibsiz!</p>
      <div className="mt-4">
        <MyListingsList listings={listings} />
      </div>
    </div>
  );
}
