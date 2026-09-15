import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const TABS: { key: Category; label: string }[] = [
  { key: "livestock", label: "🐄 Chorva mol-holi" },
  { key: "feed", label: "🌾 Yem-xashak" },
];

export default function CategoryTabs({ active }: { active: Category }) {
  return (
    <div className="flex gap-2 border-b border-gray-200">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/?category=${tab.key}`}
          className={cn(
            "-mb-px border-b-2 px-4 py-3 text-sm font-medium",
            active === tab.key
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
