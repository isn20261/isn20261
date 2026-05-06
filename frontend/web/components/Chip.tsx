"use client";

/**
 * Phase 8 (PREF-01, issue #97) — generic toggle chip.
 *
 * Used by Preferences (services, moods, ratings) and (future) home FilterBar.
 * Inactive: bordered surface; active: amber-soft fill + accent border.
 */

import type { ReactNode } from "react";

type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
};

export function Chip({
  active = false,
  onClick,
  children,
  className = "",
}: ChipProps) {
  const isInteractive = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isInteractive ? active : undefined}
      className={`
        inline-flex items-center justify-center gap-2 px-3 h-9 rounded-md
        text-13 font-medium
        transition-colors duration-150
        focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
        ${
          active
            ? "bg-accent-soft border border-accent text-text-primary"
            : "bg-surface border border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
