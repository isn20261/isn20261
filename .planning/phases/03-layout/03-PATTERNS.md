# Phase 3: Layout — Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 9 (5 new components, 2 new layouts, 2 migrations) + 1 dep install
**Analogs found:** 7 / 9 (5 visual-only analogs from `_design-reference/`, 2 code-pattern analogs from `frontend/web/`)

> **Mixed-source mapping:** the existing `frontend/web/` codebase has only 3 TSX files (root layout + 2 placeholder pages from Phases 1–2). It contains no React components yet — `components/` is empty (only `.gitkeep`). Phase 3 is the first occupant of `components/`.
>
> The strongest CODE-PATTERN analog inside `frontend/web/` is **`app/tokens/page.tsx`** (Phase 2 / DSGN-05) — it is the only file that authors real Tailwind-utility JSX in this repo, and it is the live proof of how the DSGN-06 author rule reads in practice (utilities only, no `style={{ }}`, no hex literals). Every Phase 3 component MUST mirror its className idioms.
>
> The strongest VISUAL analog is `frontend/_design-reference/shared.jsx` (and `auth.jsx`). **CLAUDE.md hard rule #2 forbids importing JSX from `_design-reference/`** — these files are read for SVG geometry, layout numbers, and copy strings only; they are NEVER imported. Each Phase 3 component re-authors fresh.
>
> Forbidden as analog: `_design-reference/shared.jsx` for component STRUCTURE (it uses `style={{ }}` everywhere — directly violates DSGN-06 if copied verbatim). The geometry it encodes is the spec; the authoring style it uses is the anti-pattern.

---

## File Classification

| File (new or modified) | Role | Data flow | Closest analog | Match quality |
|---|---|---|---|---|
| `frontend/web/components/BrandMark.tsx` | component (presentational SVG) | request-response (SSR) | `_design-reference/shared.jsx:4-29` (visual geometry only) + `app/tokens/page.tsx` (utility-class authoring) | partial — visual-spec match, code-style from tokens page |
| `frontend/web/components/Sidebar.tsx` | component (client navigation) | request-response (SSR + `usePathname` re-run) | `_design-reference/shared.jsx:32-138` (visual geometry only) + `app/tokens/page.tsx:1-50` (Tailwind utility array→render pattern) | partial — visual-spec + Tailwind idiom |
| `frontend/web/components/Navbar.tsx` | component (presentational top-bar) | request-response (SSR) | `_design-reference/home.jsx:126-153, 219-225` (visual top-bar pattern) + `app/tokens/page.tsx:53-76` (header element with utilities) | partial — visual-spec + utility idiom |
| `frontend/web/components/Footer.tsx` | component (static disclaimer) | request-response (SSR) | `_design-reference/auth.jsx:29-34` (visual disclaimer block) + `app/tokens/page.tsx` (utility-class authoring) | partial — visual + code-style |
| `frontend/web/components/PageLayout.tsx` | component (chrome composer) | request-response (SSR) | `_design-reference/home.jsx:130-153` (composition: `<DesktopRail/>` + offset content + Footer) + `app/layout.tsx` (props shape `{ children }`) | partial — composition pattern |
| `frontend/web/app/(app)/layout.tsx` | route (route-group layout) | request-response (SSR) | `app/layout.tsx` (root layout: default-export server component receiving `{ children }: Readonly<{ children: React.ReactNode }>`) | role-match (different scope: nested vs root) |
| `frontend/web/app/(auth)/layout.tsx` | route (route-group layout) | request-response (SSR) | `app/layout.tsx` (default-export server component pattern) + `_design-reference/auth.jsx:3-35` (centered-card visual) | role-match |
| `frontend/web/app/(app)/page.tsx` | route (migrated placeholder) | request-response (SSR) | existing `app/page.tsx` — same file moved | exact (relocation) |
| `frontend/web/app/(app)/tokens/page.tsx` | route (migrated tokens gallery) | request-response (SSR) | existing `app/tokens/page.tsx` — same file moved | exact (relocation) |
| `frontend/web/package.json` (modify) | config | n/a | existing `package.json` — `pnpm add lucide-react` only | n/a |

---

## Pattern Assignments

### 1. `frontend/web/components/BrandMark.tsx` — fresh re-author of brand SVG

**Visual analog:** `frontend/_design-reference/shared.jsx:4-29` — DO NOT import; copy geometry only.
**Code-style analog:** `frontend/web/app/tokens/page.tsx:53-76` — Tailwind utility authoring idiom.
**Hard constraint:** CLAUDE.md rule #2 forbids `import … from '_design-reference/'`.

**SVG geometry to retype** (copy these numbers verbatim into a fresh TSX file):

```jsx
// _design-reference/shared.jsx:4-29 — VISUAL SPEC ONLY, retype fresh
<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
  <defs>
    <linearGradient id="rabg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stopColor="var(--color-accent)"/>
      <stop offset="1" stopColor="var(--color-accent-hover)"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#rabg)"/>
  <path d="M11 22V10h6.2c2.4 0 4 1.5 4 3.7 0 1.7-.9 2.9-2.4 3.4l3 4.9h-3l-2.7-4.5h-2.4V22zm2.7-6.7h3c1.2 0 2-.6 2-1.6s-.8-1.6-2-1.6h-3z"
    fill="var(--color-on-accent)"/>
</svg>
```

**DSGN-06 escape hatch (the one documented exception per UI-SPEC §Component Inventory):**

The `<stop stopColor>` and `<rect fill>` / `<path fill>` attributes inside SVG cannot be reached by Tailwind utilities. They must reference CSS variables directly via `var(--color-accent)` etc. **This is the only file in Phase 3 where SVG attribute values legitimately contain `var(...)` strings** — every other surface uses Tailwind utilities. Each occurrence carries an inline comment per UI-SPEC §Color Escape Hatches.

**Wordmark span — utility-only style** (reauthor; the reference uses `style={{ }}` which violates DSGN-06):

```tsx
// Phase 3 authoring (utility-only, NOT the reference's inline-style)
{withWord && (
  <span className="font-display font-extrabold tracking-tight text-[18px] text-text-primary">
    Recommend<span className="text-accent">·</span>a
  </span>
)}
```

The `text-[18px]` is the documented one-off (UI-SPEC §Typography — 18 px is outside the Phase 2 type scale of 12/14/16/20/28/40/64). Inline comment required: `// non-tokenized: brand-mark wordmark size — see UI-SPEC §Typography`.

**Server component default** (mirror tokens page line 53):
```tsx
// app/tokens/page.tsx:53 — server component default
export default function TokensPage() {
```

**Apply to BrandMark:**
```tsx
export function BrandMark({ size = 28, withWord = true }: { size?: number; withWord?: boolean }) {
```

**Critical rules:**
- NO `"use client"` directive (Server Component).
- NO `style={{ }}` outside the SVG geometry exception above.
- `Recommend·a` MUST contain U+00B7 middot character (UI-SPEC §Verification Hooks grep #4: `git grep -nF 'Recommend·a'`).
- Default export NOT used — named export `BrandMark` so consumers `import { BrandMark } from '@/components/BrandMark'`.

---

### 2. `frontend/web/components/Sidebar.tsx` — Client component (rail + tab bar in one file)

**Visual analogs:**
- Desktop rail: `_design-reference/shared.jsx:32-90` — DO NOT import; copy geometry/layout only.
- Mobile tab bar: `_design-reference/shared.jsx:93-138` — DO NOT import; copy geometry only.

**Code-style analog:** `frontend/web/app/tokens/page.tsx:7-24` — array-of-objects + `.map()` rendering pattern.

**Required client directive** (CONTEXT D-07 — `usePathname` requires client):

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Sparkles, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils";
```

**Items array pattern — from tokens page lines 7–24** (the only existing array-→render precedent in the codebase):

```tsx
// Existing pattern — app/tokens/page.tsx:7-24 (verbatim)
const COLORS = [
  { utility: "bg-bg", name: "bg", value: "#0a0a0b" },
  { utility: "bg-surface", name: "surface", value: "#131316" },
  // ...
] as const;
```

**Apply to Sidebar items array** (5 routes per CONTEXT D-02):
```tsx
const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: Home, exact: true },
  { href: "/history", label: "History", Icon: Clock, exact: false },
  { href: "/recommendation", label: "Pick a movie", Icon: Sparkles, exact: false, primary: true },
  { href: "/watch-later", label: "Watch later", Icon: Bookmark, exact: false },
  { href: "/preferences", label: "Preferences", Icon: User, exact: false },
] as const;
```

**Active-match logic** (CONTEXT D-07 — exact for `/`, prefix-match for the rest):

```tsx
const pathname = usePathname();
function isActive(href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

**Visual numbers to copy from `shared.jsx:32-90`** (NOT the inline-style code — only the numbers, expressed via Tailwind utilities per UI-SPEC §Spacing Scale):

| Reference (shared.jsx) | Phase 3 Tailwind expression |
|---|---|
| `width: 'var(--rail-w)'` (line 43) | `w-rail` |
| `padding: '18px 0'` (line 46) | `py-4` (~16 px, drift accepted per UI-SPEC) |
| `width: 44, height: 44` (line 60) | `w-11 h-11` |
| `borderRadius: 10` (line 60) | `rounded-md` |
| Active bar: `left: -10, top: 8, bottom: 8, width: 3` (lines 69-72) | `absolute -left-2.5 top-2 bottom-2 w-[3px] bg-accent rounded-sm` |
| `background: 'rgba(8,8,9,.7)'` (line 44) | `bg-bg/70` (one of the 2 documented escape hatches) |
| `backdropFilter: 'blur(12px)'` (line 46) | `backdrop-blur-md` |
| `borderRight: '1px solid var(--color-border)'` (line 44) | `border-r border-border` |
| Avatar: `width: 36, height: 36` (line 79) | `w-9 h-9` |
| Avatar border: `1px solid var(--color-border-strong)` (line 81) | `border border-border-strong` |

**Mobile tab bar visual numbers** (`shared.jsx:93-138`):

| Reference | Phase 3 Tailwind |
|---|---|
| `height: 'var(--tab-h)'` (line 104) | `h-tab` |
| `gridTemplateColumns: 'repeat(5, 1fr)'` (line 106) | `grid grid-cols-5` |
| `padding: '0 6px'` (line 107) | `px-1.5` |
| `backdropFilter: 'blur(14px)'` (line 107) | `backdrop-blur-lg` |
| Primary CTA: `width: 52, height: 52, borderRadius: 26` (line 115) | `w-[52px] h-[52px] rounded-full` |
| CTA background: `var(--color-accent)` | `bg-accent text-on-accent` |
| CTA shadow: `boxShadow: '0 6px 18px rgba(245,181,68,.35)'` (line 118) | `shadow-[0_6px_18px_rgba(245,181,68,0.35)]` (escape hatch #1) |
| Label: `fontSize: 10, fontWeight: 500` (line 132) | `text-[10px] font-medium` |
| Item gap: `gap: 3` (line 128) → nearest scale | `gap-1` |
| Item padding: `padding: 6` (line 129) | `p-2` |

**Active-state visual contract** (UI-SPEC §Color "Active sidebar item color treatment"):

```tsx
// Inactive: text-text-muted, transparent bg
// Active: text-text-primary, bg-surface-elevated, + 3px amber bar at left edge
className={cn(
  "relative w-11 h-11 rounded-md flex items-center justify-center transition-colors duration-150",
  active ? "text-text-primary bg-surface-elevated" : "text-text-muted hover:text-text-primary"
)}
```

**`cn()` import pattern** — copy from where `lib/utils.ts` exports it:

```ts
// frontend/web/lib/utils.ts:1-6 (verbatim — already exists)
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Responsive split** (CONTEXT D-01 — single component with internal branching):
- Desktop rail wrapper: `<aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-rail flex-col items-center bg-bg/70 backdrop-blur-md border-r border-border py-4 gap-1 z-30">`
- Mobile tab bar wrapper: `<nav className="flex md:hidden fixed left-0 right-0 bottom-0 h-tab grid grid-cols-5 items-center px-1.5 bg-bg/90 backdrop-blur-lg border-t border-border z-30">`

**Critical rules:**
- `"use client"` MUST be the first line.
- NO `style={{ }}` props anywhere (DSGN-06 + UI-SPEC verification hook #2).
- All sidebar items use `<Link href={...}>` from `next/link` — NOT `<a>` or `<button>` (Phase 1 PATTERNS Convention 4 + ESLint rule `@next/next/no-html-link-for-pages`).
- `aria-label` and `title` on every icon-only Link per UI-SPEC §Copywriting Contract.
- Inline comments justifying the two escape hatches (`bg-bg/70`, `shadow-[...]`).
- NO literal `64`, `64px`, `width: 64` strings — must use `w-rail` / `h-tab` / `pl-rail` / `pb-tab` (UI-SPEC §Verification Hooks grep #5).

---

### 3. `frontend/web/components/Navbar.tsx` — Server top-bar component

**Visual analogs:**
- Home variant: `_design-reference/home.jsx:136-153` — DO NOT import.
- Mobile variant: `_design-reference/home.jsx:219-225` — DO NOT import.

**Code-style analog:** `frontend/web/app/tokens/page.tsx:66-76` — header element with Tailwind utilities.

**Existing header pattern in repo** (`app/tokens/page.tsx:66-76`):
```tsx
<header className="mb-12">
  <h1 className="font-display text-40 leading-none mb-2">recommend-a — design tokens</h1>
  <p className="text-secondary text-14">
    Visible no-drift gallery for every token in{" "}
    <code className="font-mono text-text-secondary">frontend/_design-reference/styles.css</code>.
    Author rule: only Tailwind theme variables in components — no hardcoded hex or px.
  </p>
  <Link href="/" className="text-accent text-14 underline mt-2 inline-block">
    ← Back to home
  </Link>
</header>
```

This is the ONLY existing header pattern — Navbar mirrors its `font-display` / `text-*` / `text-accent` utility usage.

**Visual numbers from `home.jsx:136-153`** (desktop top-bar):

| Reference (home.jsx) | Phase 3 Tailwind |
|---|---|
| `padding: '24px 40px'` (line 139) | `py-6 px-10` |
| `display: 'flex', alignItems: 'center', justifyContent: 'space-between'` | `flex items-center justify-between` |
| `gap: 8` between auth buttons (line 143) | `gap-2` |
| `gap: 12` greeting block (line 148) | `gap-3` |
| Greeting: `color: 'var(--color-text-secondary)', fontSize: 13` (line 148) | `text-text-secondary text-14` (rounded up to scale) |
| Bell icon size 18 (line 149) | `<Bell size={18} />` (lucide `size` prop is permitted) |

**Visual numbers from `home.jsx:219-225`** (mobile top-bar):

| Reference | Phase 3 Tailwind |
|---|---|
| `padding: '18px 20px'` (line 221) | `py-[18px] px-5` |
| `<BrandMark size={24}/>` (line 223) | `<BrandMark size={24} withWord={false} />` (or `withWord={true}` per planner) |

**Variant prop shape** (UI-SPEC §Component Inventory):
```tsx
type NavbarProps = {
  variant?: "home" | "mobile";
  loggedIn?: boolean;
  userName?: string;
};

export function Navbar({ variant = "home", loggedIn = false, userName = "June" }: NavbarProps) {
  // ...
}
```

**Auth-button copy** (UI-SPEC §Copywriting Contract):
- Logged-out: `<Link href="/login">Sign in</Link>` + `<Link href="/register">Create account</Link>`.
- Logged-in: `<Bell />` button with `aria-label="Notifications (coming soon)"` + `<span>Hi, {userName}</span>`.

**Critical rules:**
- NO `"use client"` (CONTEXT D-Discretion — `loggedIn` is a prop, not a hook).
- Bell button: `<button disabled aria-label="Notifications (coming soon)">` — no `onClick`.
- Brand mark wraps in `<Link href="/">` per UI-SPEC §Interaction Contracts.
- `text-text-secondary` for greeting; auth-button stubs use `text-14` and color tokens (Phase 4 owns the proper button primitive).

---

### 4. `frontend/web/components/Footer.tsx` — Static disclaimer block

**Visual analog:** `frontend/_design-reference/auth.jsx:29-34` — DO NOT import.

```jsx
// _design-reference/auth.jsx:29-34 — VISUAL SPEC ONLY
{footer && (
  <div style={{
    position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center',
    color: 'var(--color-text-muted)', fontSize: 12,
  }}>{footer}</div>
)}
```

**Disclaimer string** (`auth.jsx:86`, verbatim with U+00B7 middot):
```
Recommend·a is a fictional concept design.
```

**Visual contract** (UI-SPEC §Component Inventory + §Copywriting Contract):

```tsx
export function Footer() {
  return (
    <footer className="border-t border-border py-6 px-5 md:px-10 flex flex-col md:flex-row items-center md:justify-between gap-4 text-text-muted text-12">
      <div className="flex items-center gap-3">
        <BrandMark size={24} withWord={false} />
        <span>Recommend·a is a fictional concept design.</span>
      </div>
      <nav className="flex items-center gap-4">
        <a href="#" aria-disabled="true" className="text-12 font-medium">About</a>
        <a href="#" aria-disabled="true" className="text-12 font-medium">Privacy</a>
      </nav>
    </footer>
  );
}
```

**Critical rules:**
- `Recommend·a` MUST contain U+00B7 middot (UI-SPEC §Verification Hooks grep #4).
- Stub anchors: `href="#"` + `aria-disabled="true"` per UI-SPEC §Copywriting Contract.
- NO `style={{ }}` props (DSGN-06).
- Top border ONLY (`border-t`) — no full border.
- Server Component (no client directive).

---

### 5. `frontend/web/components/PageLayout.tsx` — Chrome composer (Server)

**Visual analog (composition shape):** `_design-reference/home.jsx:130-153, 217-225` — DO NOT import; mirror the `<DesktopRail/> + offset content + <Tab Bar/>` arrangement.

**Code-pattern analog (props shape):** `frontend/web/app/layout.tsx:24-34` — the `{ children }` composition idiom.

**Existing root-layout shape** (`app/layout.tsx:24-34` — verbatim):

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

**Apply the same `Readonly<{...}>` props idiom to PageLayout** (CONTEXT D-Discretion `header?` prop):

```tsx
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

type PageLayoutProps = Readonly<{
  header?: ReactNode;
  children: ReactNode;
}>;

export function PageLayout({ header, children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text-primary font-body">
      <Sidebar />
      <div className="md:pl-rail pb-tab md:pb-0 min-h-screen flex flex-col">
        {header}
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
```

**Content offsets** (mirroring `home.jsx:133` and `home.jsx:217`):
- `home.jsx:133`: `paddingLeft: 'var(--rail-w)'` → `md:pl-rail`
- `home.jsx:217`: `paddingBottom: 'var(--tab-h)'` → `pb-tab md:pb-0`

**Critical rules:**
- Server Component (no client directive).
- Named export, not default — `import { PageLayout } from '@/components/PageLayout'`.
- NO `style={{ }}` props — content offsets are Tailwind utilities (`md:pl-rail`, `pb-tab`).
- The Sidebar is unconditional in this wrapper (CONTEXT D-Discretion: "Avoid adding `<Sidebar>` as a prop"). Header is the only opt-in slot.

---

### 6. `frontend/web/app/(app)/layout.tsx` — `(app)` route-group layout

**Code-pattern analog:** `frontend/web/app/layout.tsx:24-34` — server-component default-export receiving `Readonly<{ children: React.ReactNode }>`.

**Existing root-layout pattern** (verbatim, `app/layout.tsx:24-34`):

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

**Apply pattern to `(app)/layout.tsx`** (Server, no `<html>` — that lives in root):

```tsx
import { PageLayout } from "@/components/PageLayout";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PageLayout>{children}</PageLayout>;
}
```

**Critical rules:**
- Default export (Next.js App Router contract for `layout.tsx` files).
- Server Component (no client directive).
- Does NOT render `<html>` or `<body>` — those are root-layout-only.
- `header` slot is left null at the layout level — pages opt-in by including their own `<Navbar>` (CONTEXT D-Discretion).

---

### 7. `frontend/web/app/(auth)/layout.tsx` — `(auth)` route-group layout

**Code-pattern analog:** `app/layout.tsx:24-34` (same default-export server-component idiom).
**Visual analog:** `_design-reference/auth.jsx:3-35` (AuthShell — DO NOT import).

**AuthShell visual numbers** (`auth.jsx:3-35`):

| Reference | Phase 3 Tailwind |
|---|---|
| `display: 'flex', alignItems: 'center', justifyContent: 'center'` (line 5) | `flex items-center justify-center` |
| `background: 'var(--color-bg)'` (line 7) | `bg-bg` |
| Card: `width: 'min(420px, calc(100% - 40px))'` (line 16) | `w-[min(420px,calc(100%-40px))]` (size primitive — not a design token) |
| Card: `padding: '40px 32px'` (line 17) | `py-10 px-8` |
| Card: `background: 'rgba(20,20,22,.75)'` (line 18) | `bg-surface/75` (closest token approximation; document inline) |
| Card: `border: '1px solid var(--color-border)'` (line 19) | `border border-border` |
| Card: `borderRadius: 18` (line 20) | `rounded-[18px]` (one-off, document; or `rounded-lg` = 16 px with 2 px drift) |
| Card: `backdropFilter: 'blur(14px)'` (line 21) | `backdrop-blur-lg` |
| Card: `boxShadow: 'var(--shadow-lg)'` (line 22) | `shadow-lg` |
| Disclaimer position: `bottom: 24, textAlign: 'center'` (lines 31-32) | `mt-6 text-center` (in-flow, OR `absolute bottom-6` if matching reference exactly) |
| Disclaimer color: `color: 'var(--color-text-muted)', fontSize: 12` (line 32) | `text-text-muted text-12` |

**Apply pattern** (planner picks: extract `<AuthShell>` to `components/AuthShell.tsx` OR inline into the layout — CONTEXT D-Discretion):

```tsx
import { BrandMark } from "@/components/BrandMark";

export default function AuthGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg">
      <div className="relative w-[min(420px,calc(100%-40px))] py-10 px-8 bg-surface/75 border border-border rounded-lg backdrop-blur-lg shadow-lg">
        <div className="flex justify-center mb-7">
          <BrandMark size={36} />
        </div>
        {children}
      </div>
      <div className="absolute bottom-6 left-0 right-0 text-center text-text-muted text-12">
        Recommend·a is a fictional concept design.
      </div>
    </div>
  );
}
```

**Critical rules:**
- Default export (Next.js layout contract).
- Server Component.
- Disclaimer string with U+00B7 middot.
- Does NOT render `<Footer>` (UI-SPEC §Component Inventory — `(auth)` group has its own internal disclaimer slot, not the global Footer).
- Does NOT render `<Sidebar>` (no rail / no tab bar on auth routes).
- File is created in Phase 3 even though `/login` and `/register` pages don't ship until Phase 4 (CONTEXT D-06).

---

### 8. `frontend/web/app/(app)/page.tsx` — relocated Phase 1 placeholder

**Analog:** the existing `frontend/web/app/page.tsx` itself (relocation, not rewrite).

**Migration:** move file from `app/page.tsx` to `app/(app)/page.tsx`. Content unchanged. Route URL unchanged (route groups are URL-cosmetic).

**Existing content** (`app/page.tsx:1-19` — copy verbatim):

```tsx
/**
 * Phase 1 (FOUND-06) placeholder root route.
 * Phase 6 (HOME-01..05, issue #95) replaces this entirely with the home/hero screen.
 */
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>recommend-a — coming soon</h1>
      <p>
        Foundation phase placeholder. The real home screen ships in Phase 6.
      </p>
      <p>
        <Link href="/tokens">View design tokens placeholder →</Link>
      </p>
    </main>
  );
}
```

**Why migrate:** so the page picks up the `(app)` group's chrome (Sidebar + Footer) and exercises `<PageLayout>` on a real existing route (CONTEXT D-Discretion recommendation a, UI-SPEC §Component Inventory "Migrations").

---

### 9. `frontend/web/app/(app)/tokens/page.tsx` — relocated Phase 2 gallery

**Analog:** the existing `frontend/web/app/tokens/page.tsx` itself (relocation).

**Migration:** move file from `app/tokens/page.tsx` to `app/(app)/tokens/page.tsx`. Content unchanged. URL `/tokens` unchanged.

**Why migrate:** exercises the chrome on the existing 167-line tokens gallery (CONTEXT D-Discretion option a). The gallery's existing `<main className="min-h-screen bg-bg text-primary font-body p-8 md:p-12">` wrapper continues to work inside `<PageLayout>`'s content slot.

---

## Shared Patterns (cross-cutting)

### Convention 1 — Server Components by default
**Source:** Phase 1 PATTERNS Convention 4; CONTEXT D-07; UI-SPEC §Component Inventory `Type` column.
**Apply to:** BrandMark, Navbar, Footer, PageLayout, both route-group layouts, both migrated pages.
**Exception:** Sidebar (CONTEXT D-07 — needs `usePathname()`) declares `"use client"` as the first line of the file.

### Convention 2 — `next/link` for all internal navigation
**Source:** Phase 1 PATTERNS Convention 4; existing usage in `app/page.tsx:5,15` and `app/tokens/page.tsx:5,73`.
**Apply to:** every Phase 3 component that has a navigation target — Sidebar items (5), Sidebar avatar, Navbar brand mark, Navbar Sign in / Create account stubs, Footer brand mark (no link per UI-SPEC §Interaction Contracts), Footer About/Privacy stubs (use `<a href="#">` not Link — they navigate nowhere).
**Pattern from `app/tokens/page.tsx:73`:**
```tsx
<Link href="/" className="text-accent text-14 underline mt-2 inline-block">
  ← Back to home
</Link>
```

### Convention 3 — DSGN-06 hard rule (theme variables only)
**Source:** `frontend/web/AGENTS.md` (DSGN-06); CONTEXT D-Discretion + UI-SPEC §Design System line "Style author rule".
**Apply to:** every file in `app/` and `components/`. Violations are PR blockers via the verification hooks in UI-SPEC §Verification Hooks.
**Allowed escape hatches in Phase 3:**
1. SVG `var(--color-*)` references inside `BrandMark.tsx` (Tailwind utilities don't reach SVG attribute values).
2. `bg-bg/70` opacity approximation for the rail backdrop (UI-SPEC §Color Escape Hatches #2).
3. `shadow-[0_6px_18px_rgba(245,181,68,0.35)]` for the mobile primary CTA glow (UI-SPEC §Color Escape Hatches #1).
4. Two non-tokenized text sizes: `text-[18px]` (BrandMark wordmark), `text-[10px]` (mobile tab label) — UI-SPEC §Typography.
5. `w-[52px] h-[52px]` for the mobile primary CTA — UI-SPEC §Spacing Scale Exceptions.
6. `-left-2.5` and `w-[3px]` for the active sidebar indicator bar — UI-SPEC §Spacing Scale.

Each escape-hatch occurrence MUST carry an inline comment justifying it per UI-SPEC §Verification Hooks.

### Convention 4 — `cn()` for conditional className
**Source:** `frontend/web/lib/utils.ts:1-6` (existing).
**Apply to:** Sidebar (active-state branching). Other Phase 3 components don't have conditional classes.
**Pattern:**
```ts
import { cn } from "@/lib/utils";

className={cn("base classes", condition && "conditional classes")}
```

### Convention 5 — `@/*` path alias
**Source:** Phase 1 D-Discretion; existing usage `app/layout.tsx:3` (`import "@/styles/globals.css"`).
**Apply to:** all imports inside Phase 3 files. Examples:
```tsx
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { PageLayout } from "@/components/PageLayout";
```

### Convention 6 — Named exports for `components/*.tsx`
**Source:** convention; `app/*.tsx` uses default exports per Next.js routing contract; `components/*.tsx` should use named exports so consumers `import { X } from '@/components/X'`.
**Apply to:** BrandMark, Sidebar, Navbar, Footer, PageLayout — all named exports.
**Exception:** `app/(app)/layout.tsx`, `app/(auth)/layout.tsx`, `app/(app)/page.tsx`, `app/(app)/tokens/page.tsx` — Next.js requires default exports for route files.

### Convention 7 — Middot character (U+00B7) verification
**Source:** UI-SPEC §Copywriting Contract; UI-SPEC §Verification Hooks grep #4.
**Apply to:** `BrandMark.tsx` (wordmark `Recommend·a`), `Footer.tsx` (disclaimer), `(auth)/layout.tsx` (disclaimer).
**Verification:** `git grep -nF 'Recommend·a' -- 'components/' 'app/'` must produce ≥ 2 hits; `git grep -nF 'Recommend-a' -- 'components/' 'app/'` must produce 0 hits (hyphen is wrong).

### Convention 8 — `lucide-react` icon usage
**Source:** CONTEXT D-08; UI-SPEC §Design System.
**Apply to:** Sidebar (Home, Clock, Sparkles, Bookmark, User), Navbar (Bell, optionally User for the logged-out avatar fallback), Footer (none).
**Pattern:**
```tsx
import { Home, Clock, Sparkles, Bookmark, User, Bell } from "lucide-react";

<Bell size={18} />  // size prop is NOT a DSGN-06 violation — icon-internal sizing is not a design token (CONTEXT D-08)
```
**Install command** (Phase 3 setup):
```bash
cd frontend/web && pnpm add lucide-react
```
Pin in `pnpm-lock.yaml`.

### Convention 9 — `(app)` and `(auth)` route groups
**Source:** Next.js App Router; CONTEXT D-06.
**Apply to:** `app/(app)/layout.tsx`, `app/(auth)/layout.tsx`. Parentheses around the segment name make it cosmetic (URL-invisible). Pages inside `(app)/` keep their original URL paths (`/`, `/tokens`, future `/recommendation` etc.).
**Reference:** Read `frontend/web/node_modules/next/dist/docs/` route-groups guide before authoring (per AGENTS.md "Read the relevant guide before writing code").

---

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `package.json` modification (lucide-react add) | dependency | Trivial — `pnpm add lucide-react`. No code-pattern analog needed. |

All other 9 files have at least a partial analog (visual or code-style).

---

## Metadata

**Analog search scope:**
- `frontend/web/app/**/*.tsx` (3 files: `layout.tsx`, `page.tsx`, `tokens/page.tsx`)
- `frontend/web/lib/**/*.ts` (1 file: `utils.ts`)
- `frontend/web/components/**` (empty — `.gitkeep` only)
- `frontend/_design-reference/*.jsx` (visual-only, never imported — CLAUDE.md rule #2)
- `frontend/web/styles/globals.css` (token-surface verification)

**Files scanned:** 8 read for content + 1 directory existence check (components/ empty)
**Files NOT used as analog (deliberately):**
- `__main__.py`, `functions/*` — Python backend, structurally unrelated, read-only milestone (CLAUDE.md rule #1)
- `frontend/_design-reference/*.jsx` for STRUCTURE — uses `style={{ }}` everywhere, would directly violate DSGN-06 if copied. Used for VISUAL geometry / numbers / copy strings only.

**Pattern extraction date:** 2026-05-05
**Greenfield component status:** confirmed — `frontend/web/components/` contains only `.gitkeep`. Phase 3 is the first occupant.
