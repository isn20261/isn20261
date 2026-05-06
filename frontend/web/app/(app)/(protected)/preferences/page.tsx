/**
 * Phase 5 (AUTH-09 test target, issue #94) — /preferences stub.
 *
 * Placeholder so RequireAuth has a real protected URL to test the
 * unauth → /login → ?from=/preferences → return-after-signin flow.
 * Phase 8 (PREF-01..05) replaces this in place with the real screen.
 */

export default function PreferencesPage() {
  return (
    <div className="p-10">
      <h1 className="font-display text-28 font-semibold text-text-primary">
        Preferences
      </h1>
      <p className="text-text-secondary text-14 mt-2">
        Phase 8 (PREF-01..05) will fill this page.
      </p>
    </div>
  );
}
