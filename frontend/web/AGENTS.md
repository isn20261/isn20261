<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Phase 2 onward — design tokens hard rule (DSGN-06 / issue #91)

After Phase 2 ships, **components and routes under `frontend/web/app/` and `frontend/web/components/` MUST consume design values exclusively through Tailwind theme variables** authored in `frontend/web/styles/globals.css`. No hardcoded hex / rgba colors. No hardcoded `font-size` / `padding` / `margin` / `width` / `height` / `border-radius` / `box-shadow` px-values for design-system properties. No `style={{ ... }}` props for properties that have a token (color, font-size, radii, shadows, the rail/tab 64 px sizes).

### Allowed token surface (the only place values are authored)

- `frontend/web/styles/globals.css` `@theme` block — colors, type scale, fonts, radii, shadows, layout sizes (`bg-bg`, `text-12`, `font-display`, `rounded-md`, `shadow-md`, `w-rail`, `h-tab`, etc.).
- Tailwind v4 default theme — flex/grid/gap utilities, the standard spacing scale (`p-4`, `m-2`, `gap-6`), positioning, sizing utilities like `w-full`, `h-screen`. These are not design tokens — they are layout primitives.

### Forbidden in `app/` and `components/`

- Hex / rgba / hsl literals inside a `className` string or a `style=` prop.
- Inline `style={{ fontSize: '14px' }}`-style props for design-system values that have a token.
- Reintroducing `tailwind.config.ts` (Tailwind v4 is CSS-first — see `frontend/web/styles/globals.css`).
- Importing from `frontend/_design-reference/` (CLAUDE.md hard rule #2 — independent of this rule, restated for completeness).

### Allowed elsewhere

- `frontend/web/styles/globals.css` — IS the place tokens are authored.
- `frontend/web/lib/` — typed mocks may contain literal token values inside test fixture data (e.g. a mock movie record with a poster URL); they are not design declarations.
- `frontend/web/app/tokens/page.tsx` (the design-system gallery) — may contain hex/rgba literals as **inline JSX text content** (e.g. `<code>#0a0a0b</code>`) so the human reader can compare rendered output against the token source. The gallery may NOT use those literals in `className` or `style` — only in displayed text.

### How to verify before pushing

```bash
cd frontend/web
# No hex inside any className in app/ or components/.
git grep -nE 'className=.*#[0-9a-fA-F]{3,6}|#[0-9a-fA-F]{3,6}.*className=' -- 'app/' 'components/' | grep -v 'app/tokens/page.tsx'
# Expected: no output.

# No inline style props in app/ or components/.
git grep -nE 'style=\{' -- 'app/' 'components/'
# Expected: no output.

# No tailwind.config.* (Tailwind v4 CSS-first).
ls tailwind.config.* 2>/dev/null && echo "VIOLATION" || echo "ok"
```
