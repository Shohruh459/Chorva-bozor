"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/types";

export default function HeaderActions({ user }: { user: AppUser | null }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <Link
        href="/kirish"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Kirish
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/elon/yangi"
        className="rounded-lg bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700"
      >
        + E&apos;lon berish
      </Link>
      <Link
        href="/profil"
        className="hidden text-gray-700 hover:text-brand-700 sm:inline"
      >
        {user.name}
      </Link>
      <button onClick={handleLogout} className="text-gray-500 hover:text-red-600">
        Chiqish
      </button>
    </div>
  );
}
