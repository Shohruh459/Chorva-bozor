"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Listing, ListingStatus } from "@/types";

const STATUS_LABEL: Record<ListingStatus, string> = {
  active: "Faol",
  sold: "Sotilgan",
  removed: "O'chirilgan",
};

const STATUS_CLASS: Record<ListingStatus, string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-gray-200 text-gray-600",
  removed: "bg-red-100 text-red-600",
};

export default function MyListingsList({ listings: initial }: { listings: Listing[] }) {
  const router = useRouter();
  const [listings, setListings] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateStatus(id: string, status: ListingStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("E'lonni butunlay o'chirmoqchimisiz?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setListings((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (listings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
        Hali e&apos;lon joylamagansiz.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <Link
              href={`/elon/${listing.id}`}
              className="font-medium text-gray-900 hover:text-brand-700"
            >
              {listing.title}
            </Link>
            <p className="text-sm text-gray-500">
              {formatPrice(listing.price)} · {listing.district}, {listing.region} ·{" "}
              {formatDate(listing.created_at)}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[listing.status]}`}
            >
              {STATUS_LABEL[listing.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={`/elon/tahrirlash/${listing.id}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
            >
              Tahrirlash
            </Link>
            {listing.status === "active" && (
              <button
                disabled={busyId === listing.id}
                onClick={() => updateStatus(listing.id, "sold")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                Sotildi deb belgilash
              </button>
            )}
            {listing.status === "sold" && (
              <button
                disabled={busyId === listing.id}
                onClick={() => updateStatus(listing.id, "active")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                Qayta faollashtirish
              </button>
            )}
            <button
              disabled={busyId === listing.id}
              onClick={() => handleDelete(listing.id)}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              O&apos;chirish
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
