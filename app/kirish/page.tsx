import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import TelegramLoginButton from "@/components/TelegramLoginButton";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
      <div className="text-4xl">🐄</div>
      <h1 className="mt-3 text-xl font-bold text-gray-900">
        Chorva Bozorga xush kelibsiz
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Davom etish uchun Telegram orqali kiring — parol kerak emas.
      </p>
      <div className="mt-6">
        <Suspense fallback={null}>
          <TelegramLoginButton />
        </Suspense>
      </div>
    </div>
  );
}
