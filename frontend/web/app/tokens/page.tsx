/**
 * Phase 1 (FOUND-07) placeholder second route — proves App Router multi-route wiring.
 * Phase 2 (DSGN-05, issue #91) fills THIS file in place with the visible tokens demo
 * (color swatches, type samples, radii, shadows). The file path is locked.
 */
import Link from "next/link";

export default function TokensPage() {
  return (
    <main>
      <h1>Design tokens — populated in Phase 2</h1>
      <p>
        Foundation phase placeholder. Phase 2 (issue #91) replaces this body with
        a visible token demo so design drift against frontend/_design-reference/styles.css
        is spottable in one screen.
      </p>
      <p>
        <Link href="/">← Back to home placeholder</Link>
      </p>
    </main>
  );
}
