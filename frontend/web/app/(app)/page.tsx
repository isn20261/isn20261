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
