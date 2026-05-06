/**
 * Phase 3 (LAYT-01, issue #92) — top-bar component.
 *
 * Reusable top bar rendered as an opt-in `header` slot on `<PageLayout>` (CONTEXT D-03).
 * The `(app)` route-group layout does NOT render Navbar globally — pages opt in by
 * including <Navbar variant="..." /> in their own JSX. This matches the reference:
 * home shows a top bar; detail / settings do not.
 *
 * Server Component — `loggedIn` is a prop (not a hook). Phase 5 will swap callers to
 * pass `useAuth().isAuthenticated` at the page level (page becomes the client boundary).
 */

import Link from "next/link";
import { Bell } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

type NavbarProps = {
  variant?: "home" | "mobile";
  loggedIn?: boolean;
  userName?: string;
};

export function Navbar({ variant = "home", loggedIn = false, userName = "June" }: NavbarProps) {
  if (variant === "mobile") {
    return (
      // non-tokenized: 18px vertical padding from reference home.jsx:221 — between p-4 (16px) and p-5 (20px)
      <header className="flex items-center justify-between py-[18px] px-5">
        <Link href="/" aria-label="recommend-a — home">
          <BrandMark size={24} withWord={false} />
        </Link>
        <button
          type="button"
          disabled
          aria-label="Notifications (coming soon)"
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
      <Link href="/" aria-label="recommend-a — home">
        <BrandMark size={28} withWord />
      </Link>

      {loggedIn ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            aria-label="Notifications (coming soon)"
            className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted"
          >
            <Bell size={18} />
          </button>
          <span className="text-text-secondary text-14 font-medium">Hi, {userName}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-text-secondary hover:text-text-primary text-14 font-semibold transition-colors duration-150 px-3 py-2 rounded-md focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-on-accent bg-accent hover:bg-accent-hover text-14 font-semibold transition-colors duration-150 px-3 py-2 rounded-md focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Create account
          </Link>
        </div>
      )}
    </header>
  );
}
