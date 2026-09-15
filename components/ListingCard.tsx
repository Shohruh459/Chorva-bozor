import Link from "next/link";
import Image from "next/image";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Listing } from "@/types";

export default function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.images[0];

  return (
    <Link
      href={`/elon/${listing.id}`}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            {listing.category === "livestock" ? "🐄" : "🌾"}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-gray-900">
          {listing.title}
        </p>
        <p className="mt-1 font-semibold text-brand-700">
          {formatPrice(listing.price)}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500">
          {listing.district}, {listing.region}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {formatDate(listing.created_at)}
        </p>
      </div>
    </Link>
  );
}
