"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Listing } from "@/types";

export default function AdminListingsList({
  listings: initial,
}: {
  listings: Listing[];
}) {
  const [listings, setListings] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Bu e'lonni (spam/nomaqbul) o'chirmoqchimisiz?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setListings((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  if (listings.length === 0) {
    return <p className="text-gray-500">E&apos;lonlar yo&apos;q.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Sarlavha</th>
            <th className="px-4 py-2">Bo&apos;lim</th>
            <th className="px-4 py-2">Narx</th>
            <th className="px-4 py-2">Hudud</th>
            <th className="px-4 py-2">Holat</th>
            <th className="px-4 py-2">Sana</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.id} className="border-b last:border-0">
              <td className="px-4 py-2">
                <Link href={`/elon/${listing.id}`} className="hover:text-brand-700">
                  {listing.title}
                </Link>
              </td>
              <td className="px-4 py-2">
                {listing.category === "livestock" ? "Chorva" : "Yem-xashak"}
              </td>
              <td className="px-4 py-2">{formatPrice(listing.price)}</td>
              <td className="px-4 py-2">
                {listing.district}, {listing.region}
              </td>
              <td className="px-4 py-2">{listing.status}</td>
              <td className="px-4 py-2">{formatDate(listing.created_at)}</td>
              <td className="px-4 py-2">
                <button
                  disabled={busyId === listing.id}
                  onClick={() => handleDelete(listing.id)}
                  className="rounded-lg border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  O&apos;chirish
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
