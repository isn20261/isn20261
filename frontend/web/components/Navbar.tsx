"use client";

/**
 * Phase 5 (AUTH-08, issue #94) — top-bar component (Client).
 *
 * Phase 4 kept this Server; Phase 5 makes it Client so it can react to auth
 * context changes directly without a wrapper. No SSR data is lost — the
 * markup only depends on auth state.
 */

import Link from "next/link";
import { Bell } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/lib/auth/AuthContext";

type NavbarProps = {
  variant?: "home" | "mobile";
};

export function Navbar({ variant = "home" }: NavbarProps) {
  const { isAuthenticated, user } = useAuth();
  const loggedIn = isAuthenticated;
  const userName = user?.email.split("@")[0] ?? "você";
  if (variant === "mobile") {
    return (
      // non-tokenized: 18px vertical padding from reference home.jsx:221 — between p-4 (16px) and p-5 (20px)
      <header className="flex items-center justify-between py-[18px] px-5">
        <Link href="/" aria-label="recommend-a — início">
          <BrandMark size={24} withWord={false} />
        </Link>
        <button
          type="button"
          disabled
          aria-label="Notificações (em breve)"
          className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted"
        >
          <Bell size={18} />
        </button>
      </header>
    );
  }

  // variant === "home" (desktop)
  return (
    <header className="flex items-center justify-between py-6 px-10">
      <Link href="/" aria-label="recommend-a — início">
        <BrandMark size={28} withWord />
      </Link>

      {loggedIn ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            aria-label="Notificações (em breve)"
            className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted"
          >
            <Bell size={18} />
          </button>
          <AccountMenu userName={userName}>
            <button
              type="button"
              aria-label={`Menu da conta de ${userName}`}
              className="text-text-secondary hover:text-text-primary text-14 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
            >
              Olá, {userName}
            </button>
          </AccountMenu>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-text-secondary hover:text-text-primary text-14 font-semibold transition-colors duration-150 px-3 py-2 rounded-md focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="text-on-accent bg-accent hover:bg-accent-hover text-14 font-semibold transition-colors duration-150 px-3 py-2 rounded-md focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Criar conta
          </Link>
        </div>
      )}
    </header>
  );
}
