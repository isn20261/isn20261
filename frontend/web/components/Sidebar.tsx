"use client";

/**
 * Phase 3 (LAYT-02, issue #92) — primary navigation.
 *
 * Single Client Component that internally branches on Tailwind `md` (768 px):
 *   - Desktop (≥ md): fixed left vertical rail at w-rail (64 px) with brand,
 *     5 icon nav items, bottom avatar.
 *   - Mobile (< md): fixed bottom tab bar at h-tab (64 px) with 5 items;
 *     central Pick CTA is a 52×52 amber circle (UI-SPEC §Spacing Scale row 13).
 *
 * Active state computed via usePathname() — exact match for "/", prefix-match
 * for the other four routes (CONTEXT D-07).
 *
 * DSGN-06 escape hatches (the only ones in this file — see UI-SPEC §Color):
 *   - bg-bg/70             : rail backdrop opacity approximation of reference rgba(8,8,9,.7)
 *   - shadow-[0_6px_...]   : amber glow on mobile Pick CTA — one-off shadow shape
 *   - w-[52px] h-[52px]    : mobile Pick CTA circle (size primitive, not a design token)
 *   - text-[10px]          : mobile tab label font-size (below Phase 2 type scale)
 *   - -left-2.5 / w-[3px]  : active indicator bar geometry (UI-SPEC §Spacing Scale)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Sparkles, Bookmark, User } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  exact: boolean;
  primary?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/",               label: "Home",          Icon: Home,     exact: true },
  { href: "/history",        label: "History",       Icon: Clock,    exact: false },
  { href: "/recommendation", label: "Pick a movie",  Icon: Sparkles, exact: false, primary: true },
  { href: "/watch-later",    label: "Watch later",   Icon: Bookmark, exact: false },
  { href: "/preferences",    label: "Preferences",   Icon: User,     exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const loggedIn = isAuthenticated;
  const userName = user?.email.split("@")[0] ?? "there";
  const initials = userName.slice(0, 2).toUpperCase();
  const avatarHref = loggedIn ? "/preferences" : "/login";
  const avatarLabel = loggedIn ? `Account: ${userName}` : "Sign in";

  return (
    <>
      {/* Desktop rail — hidden below md, visible at md+ */}
      {/* non-tokenized: bg-bg/70 approximates reference rgba(8,8,9,.7) — see UI-SPEC §Color Escape Hatches. Promote to --color-rail-bg if reviewers spot drift at PR. */}
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-rail flex-col items-center bg-bg/70 backdrop-blur-md border-r border-border py-4 gap-1 z-30"
        aria-label="Primary"
      >
        <div className="flex items-center justify-center pb-3">
          <BrandMark size={28} withWord={false} />
        </div>
        <ul className="flex flex-col items-center gap-1 mt-4">
          {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
            const active = isActive(pathname, href, exact);
            return (
              <li key={href} className="relative">
                {active && (
                  // non-tokenized: -left-2.5 (-10px) and w-[3px] are the exact reference geometry — see UI-SPEC §Spacing Scale "Active sidebar indicator geometry"
                  <span
                    className="absolute -left-2.5 top-2 bottom-2 w-[3px] bg-accent rounded-sm"
                    aria-hidden
                  />
                )}
                <Link
                  href={href}
                  title={label}
                  aria-label={label}
                  className={cn(
                    "relative w-11 h-11 rounded-md flex items-center justify-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                    active
                      ? "text-text-primary bg-surface-elevated"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <Icon size={20} />
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex flex-col items-center pb-3">
          {loggedIn ? (
            <AccountMenu side="right" align="start" userName={userName}>
              <button
                type="button"
                aria-label={`Account menu for ${userName}`}
                title={`Account menu for ${userName}`}
                className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <span className="font-display text-12 font-semibold text-text-primary">{initials}</span>
              </button>
            </AccountMenu>
          ) : (
            <Link
              href={avatarHref}
              aria-label={avatarLabel}
              title={avatarLabel}
              className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center text-text-muted hover:text-text-primary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <User size={16} />
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile tab bar — visible below md, hidden at md+ */}
      {/* non-tokenized: bg-bg/90 (slightly more opaque than rail to mask scroll content underneath) — also approximation of reference rgba(8,8,9,...) */}
      <nav
        className="flex md:hidden fixed left-0 right-0 bottom-0 h-tab grid grid-cols-5 items-center px-1.5 bg-bg/90 backdrop-blur-lg border-t border-border z-30"
        aria-label="Primary"
      >
        {NAV_ITEMS.map(({ href, label, Icon, exact, primary }) => {
          const active = isActive(pathname, href, exact);

          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2"
                )}
              >
                {/* non-tokenized: w-[52px] h-[52px] is the exact reference 52×52 px CTA (no Tailwind core scale step at 52) — see UI-SPEC §Spacing Scale row 13 */}
                {/* non-tokenized: shadow-[0_6px_18px_rgba(245,181,68,0.35)] is the amber CTA glow — see UI-SPEC §Color Escape Hatches #1. Promote to --shadow-cta-glow if Phase 6 hero CTA reuses it. */}
                <span className="w-[52px] h-[52px] rounded-full bg-accent text-on-accent flex items-center justify-center shadow-[0_6px_18px_rgba(245,181,68,0.35)]">
                  <Icon size={22} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                active ? "text-text-primary" : "text-text-muted hover:text-text-primary"
              )}
            >
              <Icon size={20} />
              {/* non-tokenized: text-[10px] is below Phase 2 type scale (smallest = text-12) — see UI-SPEC §Typography */}
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
