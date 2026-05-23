"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Dark-locked Sonner toaster for Cinedica (CLAUDE.md hard rule #4 / DSGN-06).
//
// The shadcn template ships with `useTheme()` from `next-themes` and `theme="system"`,
// but this project is dark-only — there is no theme switcher. We hardcode `theme="dark"`
// and drop the `next-themes` dependency from the component (it stays in package.json
// in case a future phase adds a switcher, but this component does not import it).
//
// The shadcn template also sets `--normal-bg: var(--popover)` etc., referencing token
// names from the standard shadcn registry (`--popover`, `--border`, `--radius`). Those
// tokens do not exist in `styles/globals.css` — this project uses the verbatim
// `_design-reference` token namespace (`--color-surface`, `--color-text-primary`,
// `--color-border`, `--radius-md`). The style overrides below point Sonner's internal
// CSS vars at the project tokens so toasts render with the correct dark theme.

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      data-slot="sonner-toaster"
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-text-primary)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-md)",
          "--success-bg": "var(--color-surface)",
          "--success-text": "var(--color-success)",
          "--success-border": "var(--color-border)",
          "--error-bg": "var(--color-surface)",
          "--error-text": "var(--color-danger)",
          "--error-border": "var(--color-border)",
          "--warning-bg": "var(--color-surface)",
          "--warning-text": "var(--color-warning)",
          "--warning-border": "var(--color-border)",
          "--info-bg": "var(--color-surface)",
          "--info-text": "var(--color-text-primary)",
          "--info-border": "var(--color-border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
