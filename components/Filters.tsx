"use client";

import { useState } from "react";
import { REGIONS, getDistricts } from "@/lib/regions";
import type { Category } from "@/types";

interface FiltersProps {
  category: Category;
  defaultRegion?: string;
  defaultDistrict?: string;
  defaultMinPrice?: string;
  defaultMaxPrice?: string;
}

export default function Filters({
  category,
  defaultRegion,
  defaultDistrict,
  defaultMinPrice,
  defaultMaxPrice,
}: FiltersProps) {
  const [region, setRegion] = useState(defaultRegion ?? "");
  const districts = region ? getDistricts(region) : [];

  return (
    <form
      method="get"
      className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4"
    >
      <input type="hidden" name="category" value={category} />

      <select
        name="region"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Barcha viloyatlar</option>
        {REGIONS.map((r) => (
          <option key={r.name} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>

      <select
        name="district"
        defaultValue={defaultDistrict ?? ""}
        disabled={!region}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
      >
        <option value="">Barcha tumanlar</option>
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <input
        type="number"
        name="minPrice"
        min="0"
        placeholder="Narx (dan)"
        defaultValue={defaultMinPrice}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="number"
        name="maxPrice"
        min="0"
        placeholder="Narx (gacha)"
        defaultValue={defaultMaxPrice}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <button
        type="submit"
        className="col-span-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:col-span-4"
      >
        Qidirish
      </button>
    </form>
  );
}
