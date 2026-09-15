import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import HeaderActions from "./HeaderActions";

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-brand-700"
        >
          🐄 Chorva Bozor
        </Link>
        <HeaderActions user={user} />
      </div>
    </header>
  );
}
