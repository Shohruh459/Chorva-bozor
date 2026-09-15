import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminListingsList from "@/components/AdminListingsList";
import type { Listing } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-gray-500">
        Bu sahifa faqat administrator uchun.
      </div>
    );
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const listings = (data as Listing[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900">Admin panel</h1>
      <p className="mt-1 text-sm text-gray-500">Jami e&apos;lonlar: {listings.length}</p>
      <div className="mt-4">
        <AdminListingsList listings={listings} />
      </div>
    </div>
  );
}
