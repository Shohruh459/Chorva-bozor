import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getSessionCookieValue } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import ListingForm from "@/components/ListingForm";
import type { Listing } from "@/types";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/kirish?next=/elon/tahrirlash/${id}`);

  const token = await getSessionCookieValue();
  const supabase = await createServerClient(token);
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const listing = data as Listing | null;
  if (!listing || listing.user_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900">E&apos;lonni tahrirlash</h1>
      <div className="mt-4">
        <ListingForm mode="edit" initial={listing} />
      </div>
    </div>
  );
}
