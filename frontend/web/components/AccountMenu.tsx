"use client";

/**
 * Phase 4 (AUTH-06, D-05, issue #93) — account-menu popover wrapper.
 *
 * Wraps the trigger element (children, asChild) in a shadcn Popover. Used by:
 *   - components/Sidebar.tsx desktop avatar (when loggedIn) — D-05
 *   - components/Navbar.tsx greeting cluster (when loggedIn && variant === 'home') — D-05
 *
 * Two menu items hardcoded inside this component:
 *   - Account → <Link href="/preferences"> (Phase 8 fills the page)
 *   - Sign out → signOut() + router.push('/login') (D-05)
 *
 * Mobile Sidebar tab User-slot is NOT wrapped (D-06 — keeps Phase 3 navigation).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth/AuthContext";

type AccountMenuProps = {
  children: React.ReactNode;
  userName?: string;
  side?: "right" | "bottom";
  align?: "start" | "end";
};

export function AccountMenu({
  children,
  userName = "June",
  side = "bottom",
  align = "end",
}: AccountMenuProps) {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  return (
    <Popover>
      <PopoverTrigger
        render={children as React.ReactElement<Record<string, unknown>>}
      />
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="min-w-44 p-1 bg-surface-elevated border border-border rounded-md shadow-lg w-auto gap-0"
      >
        <Link
          href="/preferences"
          aria-label={`Account for ${userName}`}
          className="flex items-center gap-2 px-3 py-2 rounded-sm text-14 font-medium text-text-primary hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
        >
          <User size={16} />
          <span>Account</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-14 font-medium text-danger hover:bg-danger/10 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
