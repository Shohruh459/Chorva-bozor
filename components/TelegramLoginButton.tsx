"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TelegramLoginPayload } from "@/types";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginPayload) => void;
  }
}

export default function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    window.onTelegramAuth = async (user: TelegramLoginPayload) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          alert(json.error ?? "Kirishda xato yuz berdi");
          return;
        }
        router.push(next);
        router.refresh();
      } catch {
        alert("Kirishda xato yuz berdi");
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [botUsername, next, router]);

  if (!botUsername) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Telegram bot sozlanmagan. .env faylida
        NEXT_PUBLIC_TELEGRAM_BOT_USERNAME qiymatini kiriting
        (INSTRUCTIONS.md&apos;ga qarang).
      </p>
    );
  }

  return <div ref={containerRef} />;
}
