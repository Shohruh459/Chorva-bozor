import { createPublicClient } from "@/lib/supabase/publicClient";
import CategoryTabs from "@/components/CategoryTabs";
import Filters from "@/components/Filters";
import ListingGrid from "@/components/ListingGrid";
import type { Category, Listing } from "@/types";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<{
    category?: string;
    region?: string;
    district?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function HomePage({ searchParams: searchParamsPromise }: HomeProps) {
  const searchParams = await searchParamsPromise;
  const category: Category = searchParams.category === "feed" ? "feed" : "livestock";

  let listings: Listing[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createPublicClient();
    let query = supabase
      .from("listings")
      .select("*")
      .eq("status", "active")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (searchParams.region) query = query.eq("region", searchParams.region);
    if (searchParams.district) query = query.eq("district", searchParams.district);
    if (searchParams.minPrice) query = query.gte("price", Number(searchParams.minPrice));
    if (searchParams.maxPrice) query = query.lte("price", Number(searchParams.maxPrice));

    const { data, error } = await query;
    if (error) {
      loadError = error.message;
    } else {
      listings = (data as Listing[]) ?? [];
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Noma'lum xato";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <CategoryTabs active={category} />

      <div className="mt-4">
        <Filters
          category={category}
          defaultRegion={searchParams.region}
          defaultDistrict={searchParams.district}
          defaultMinPrice={searchParams.minPrice}
          defaultMaxPrice={searchParams.maxPrice}
        />
      </div>

      <div className="mt-4">
        {loadError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            E&apos;lonlarni yuklab bo&apos;lmadi. Supabase hali sozlanmagan bo&apos;lishi
            mumkin — INSTRUCTIONS.md&apos;ga qarang. ({loadError})
          </p>
        ) : (
          <ListingGrid listings={listings} />
        )}
      </div>
    </div>
  );
}
