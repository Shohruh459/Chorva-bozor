"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { REGIONS, getDistricts } from "@/lib/regions";
import type { Category, FeedTuri, Listing, LivestockTuri } from "@/types";

const LIVESTOCK_TURI: { value: LivestockTuri; label: string }[] = [
  { value: "mol", label: "Mol (sigir/buzoq)" },
  { value: "qoy", label: "Qo'y" },
  { value: "echki", label: "Echki" },
  { value: "tovuq", label: "Tovuq/parranda" },
  { value: "ot", label: "Ot" },
  { value: "boshqa", label: "Boshqa" },
];

const FEED_TURI: { value: FeedTuri; label: string }[] = [
  { value: "pichan", label: "Pichan" },
  { value: "don", label: "Don" },
  { value: "kombikorm", label: "Kombikorm" },
  { value: "silos", label: "Silos" },
  { value: "boshqa", label: "Boshqa" },
];

const MAX_IMAGES = 5;

interface ListingFormProps {
  mode: "create" | "edit";
  initial?: Listing;
}

export default function ListingForm({ mode, initial }: ListingFormProps) {
  const router = useRouter();
  const initialDetails = (initial?.details ?? {}) as unknown as Record<
    string,
    unknown
  >;

  const [category, setCategory] = useState<Category>(
    initial?.category ?? "livestock"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const [turi, setTuri] = useState<string>(
    (initialDetails.turi as string) ?? (category === "livestock" ? "mol" : "pichan")
  );
  const [yoshi, setYoshi] = useState(
    initialDetails.yoshi ? String(initialDetails.yoshi) : ""
  );
  const [jinsi, setJinsi] = useState((initialDetails.jinsi as string) ?? "");
  const [soni, setSoni] = useState(
    initialDetails.soni ? String(initialDetails.soni) : ""
  );
  const [ogirligi, setOgirligi] = useState(
    initialDetails.ogirligi ? String(initialDetails.ogirligi) : ""
  );
  const [birligi, setBirligi] = useState(
    (initialDetails.birligi as string) ?? "kg"
  );

  const [existingImages, setExistingImages] = useState<string[]>(
    initial?.images ?? []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const districts = useMemo(() => (region ? getDistricts(region) : []), [region]);

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const total = existingImages.length + newFiles.length + files.length;
    if (total > MAX_IMAGES) {
      setError(`Maksimal ${MAX_IMAGES} ta rasm yuklash mumkin`);
      return;
    }
    setError(null);
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeExistingImage(url: string) {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !price || !region || !district || !phone.trim()) {
      setError("Iltimos, * bilan belgilangan maydonlarni to'ldiring");
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        const formData = new FormData();
        newFiles.forEach((file) => formData.append("files", file));
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadJson.error ?? "Rasm yuklashda xato");
        }
        uploadedUrls = uploadJson.urls as string[];
      }

      const details =
        category === "livestock"
          ? {
              turi,
              ...(yoshi ? { yoshi: Number(yoshi) } : {}),
              ...(jinsi ? { jinsi } : {}),
              ...(soni ? { soni: Number(soni) } : {}),
            }
          : {
              turi,
              ...(ogirligi ? { ogirligi: Number(ogirligi) } : {}),
              birligi,
            };

      const payload = {
        category,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        region,
        district,
        phone: phone.trim(),
        images: [...existingImages, ...uploadedUrls],
        details,
      };

      const url = mode === "create" ? "/api/listings" : `/api/listings/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Saqlashda xato yuz berdi");
      }

      router.push(`/elon/${json.listing.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noma'lum xato");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Bo&apos;lim
        </label>
        <div className="flex gap-2">
          {(["livestock", "feed"] as Category[]).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => {
                setCategory(c);
                setTuri(c === "livestock" ? "mol" : "pichan");
              }}
              className={`rounded-lg border px-4 py-2 text-sm ${
                category === c
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              {c === "livestock" ? "🐄 Chorva mol-holi" : "🌾 Yem-xashak"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Sarlavha *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Masalan: Sog'lom sog'in sigir"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Turi *
        </label>
        <select
          value={turi}
          onChange={(e) => setTuri(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {(category === "livestock" ? LIVESTOCK_TURI : FEED_TURI).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {category === "livestock" ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Yoshi (oy)
            </label>
            <input
              type="number"
              min="0"
              value={yoshi}
              onChange={(e) => setYoshi(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Jinsi
            </label>
            <select
              value={jinsi}
              onChange={(e) => setJinsi(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tanlanmagan</option>
              <option value="erkak">Erkak</option>
              <option value="urgochi">Urg&apos;ochi</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Soni (bosh)
            </label>
            <input
              type="number"
              min="1"
              value={soni}
              onChange={(e) => setSoni(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Og&apos;irligi
            </label>
            <input
              type="number"
              min="0"
              value={ogirligi}
              onChange={(e) => setOgirligi(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Birligi
            </label>
            <select
              value={birligi}
              onChange={(e) => setBirligi(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="kg">kg</option>
              <option value="tonna">tonna</option>
              <option value="bog">bog&apos;</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Narx (so&apos;m) *
        </label>
        <input
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Viloyat *
          </label>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setDistrict("");
            }}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tanlang</option>
            {REGIONS.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tuman *
          </label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
            disabled={!region}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">Tanlang</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Telefon raqam *
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="+998 90 123 45 67"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Tavsif
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Rasmlar (maksimal {MAX_IMAGES} ta)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="block w-full text-sm"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {existingImages.map((url) => (
            <div
              key={url}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingImage(url)}
                className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          {newFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeNewFile(i)}
                className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting
          ? "Saqlanmoqda..."
          : mode === "create"
          ? "E'lonni joylash"
          : "Saqlash"}
      </button>
    </form>
  );
}
