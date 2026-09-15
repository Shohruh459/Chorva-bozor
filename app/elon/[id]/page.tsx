import { notFound } from "next/navigation";
import Image from "next/image";
import { createPublicClient } from "@/lib/supabase/publicClient";
import {
  formatPrice,
  formatDate,
  telDeepLink,
  telegramDeepLink,
} from "@/lib/utils";
import type { Listing } from "@/types";

export const dynamic = "force-dynamic";

async function getListing(id: string): Promise<Listing | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Listing) ?? null;
}

function detailRows(listing: Listing): { label: string; value: string }[] {
  const d = listing.details as unknown as Record<string, unknown>;

  if (listing.category === "livestock") {
    return [
      { label: "Turi", value: d.turi ? String(d.turi) : "—" },
      { label: "Yoshi", value: d.yoshi ? `${d.yoshi} oy` : "—" },
      { label: "Jinsi", value: d.jinsi ? String(d.jinsi) : "—" },
      { label: "Soni", value: d.soni ? `${d.soni} bosh` : "—" },
    ];
  }

  return [
    { label: "Turi", value: d.turi ? String(d.turi) : "—" },
    {
      label: "Og'irligi",
      value: d.ogirligi ? `${d.ogirligi} ${d.birligi ?? "kg"}` : "—",
    },
  ];
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {listing.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {listing.images.map((src) => (
                <div
                  key={src}
                  className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
                >
                  <Image
                    src={src}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 400px"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl bg-gray-100 text-6xl">
              {listing.category === "livestock" ? "🐄" : "🌾"}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">{listing.title}</h1>
          <p className="mt-2 text-2xl font-bold text-brand-700">
            {formatPrice(listing.price)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {listing.district}, {listing.region} · {formatDate(listing.created_at)}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
            {detailRows(listing).map((row) => (
              <div key={row.label}>
                <dt className="text-gray-500">{row.label}</dt>
                <dd className="font-medium text-gray-900">{row.value}</dd>
              </div>
            ))}
          </dl>

          {listing.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-gray-700">
              {listing.description}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <a
              href={telDeepLink(listing.phone)}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
            >
              📞 Qo&apos;ng&apos;iroq qilish
            </a>
            {listing.telegram_username && (
              <a
                href={telegramDeepLink(listing.telegram_username)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-lg border border-brand-600 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                ✈️ Telegram orqali yozish
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
