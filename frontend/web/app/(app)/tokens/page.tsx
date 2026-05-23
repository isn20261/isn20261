/**
 * Phase 2 (DSGN-05) tokens demo route — visible proof that every token
 * authored in styles/globals.css @theme (plan 02-01) renders correctly.
 */
import Link from "next/link";

const COLORS = [
  { utility: "bg-bg", name: "bg", value: "#0a0a0b" },
  { utility: "bg-surface", name: "surface", value: "#131316" },
  { utility: "bg-surface-elevated", name: "surface-elevated", value: "#1c1c20" },
  { utility: "bg-surface-2", name: "surface-2", value: "#232328" },
  { utility: "bg-border", name: "border", value: "#2a2a30" },
  { utility: "bg-border-strong", name: "border-strong", value: "#3a3a42" },
  { utility: "bg-text-primary", name: "text-primary", value: "#f5f5f6" },
  { utility: "bg-text-secondary", name: "text-secondary", value: "#a4a4ad" },
  { utility: "bg-text-muted", name: "text-muted", value: "#6c6c76" },
  { utility: "bg-accent", name: "accent", value: "#f5b544" },
  { utility: "bg-accent-hover", name: "accent-hover", value: "#ffc560" },
  { utility: "bg-accent-soft", name: "accent-soft", value: "rgba(245, 181, 68, 0.12)" },
  { utility: "bg-on-accent", name: "on-accent", value: "#1a1305" },
  { utility: "bg-success", name: "success", value: "#4ade80" },
  { utility: "bg-warning", name: "warning", value: "#f59e0b" },
  { utility: "bg-danger", name: "danger", value: "#f87171" },
] as const;

const TYPE_SCALE = [
  { className: "text-12", label: "text-12 / 12px" },
  { className: "text-14", label: "text-14 / 14px" },
  { className: "text-16", label: "text-16 / 16px" },
  { className: "text-20", label: "text-20 / 20px" },
  { className: "text-28", label: "text-28 / 28px" },
  { className: "text-40", label: "text-40 / 40px" },
  { className: "text-64", label: "text-64 / 64px" },
] as const;

const LOREM = "Um pequeno jabuti xereta viu dez cegonhas felizes";

function ColorSwatch({ utility, name, value, isText }: { utility: string; name: string; value: string; isText?: boolean }) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className={`h-20 ${utility}`} aria-label={`amostra ${name}`} />
      <div className="p-3 text-12">
        <div className="font-mono text-text-primary">{name}</div>
        <div className="text-muted">{value}</div>
        {isText && (
          <span className={`text-${name.replace("text-", "")} text-14 font-semibold`}>Aa</span>
        )}
      </div>
    </div>
  );
}

export default function TokensPage() {
  return (
    <main className="min-h-screen bg-bg text-primary font-body p-8 md:p-12">
      <div
        role="note"
        className="mb-8 rounded-md border border-accent bg-accent-soft p-4 text-14 text-accent"
      >
        <strong className="font-display font-semibold">Regra de autoria:</strong>{" "}
        componentes em <code className="font-mono">app/</code> e{" "}
        <code className="font-mono">components/</code> podem usar apenas variáveis de tema do
        Tailwind — sem hex ou px hardcoded. Veja{" "}
        <code className="font-mono">frontend/web/AGENTS.md</code>.
      </div>
      <header className="mb-12">
        <h1 className="font-display text-40 leading-none mb-2">Cinedica — tokens de design</h1>
        <p className="text-secondary text-14">
          Galeria visível sem drift para cada token em{" "}
          <code className="font-mono text-text-secondary">frontend/_design-reference/styles.css</code>.
          Regra de autoria: apenas variáveis de tema do Tailwind em componentes — sem hex ou px hardcoded.
        </p>
        <Link href="/" className="text-accent text-14 underline mt-2 inline-block">
          ← Voltar para o início
        </Link>
      </header>

      {/* === Colors === */}
      <section aria-labelledby="colors-heading" className="mb-16">
        <h2 id="colors-heading" className="font-display text-28 mb-6">Cores</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {COLORS.map((color) => (
            <ColorSwatch
              key={color.name}
              utility={color.utility}
              name={color.name}
              value={color.value}
              isText={color.name.startsWith("text-")}
            />
          ))}
        </div>
      </section>

      {/* === Typography === */}
      <section aria-labelledby="type-heading" className="mb-16">
        <h2 id="type-heading" className="font-display text-28 mb-6">Tipografia</h2>
        <div className="space-y-6">
          {TYPE_SCALE.map((step) => (
            <div key={step.className} className="border-b border-border pb-4">
              <div className="text-muted text-12 font-mono mb-2">{step.label}</div>
              <p className={`${step.className} font-display mb-1`}>
                Manrope (display) — {LOREM}
              </p>
              <p className={`${step.className} font-body`}>
                Inter (body) — {LOREM}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* === Radii === */}
      <section aria-labelledby="radii-heading" className="mb-16">
        <h2 id="radii-heading" className="font-display text-28 mb-6">Raios</h2>
        <div className="flex flex-wrap gap-6">
          {(
            [
              { cls: "rounded-sm", label: "rounded-sm / 6px" },
              { cls: "rounded-md", label: "rounded-md / 10px" },
              { cls: "rounded-lg", label: "rounded-lg / 16px" },
              { cls: "rounded-xl", label: "rounded-xl / 22px" },
            ] as const
          ).map((r) => (
            <div key={r.cls} className="flex flex-col items-center gap-2">
              <div className={`w-24 h-24 bg-surface-2 border border-border ${r.cls}`} />
              <span className="text-12 text-muted font-mono">{r.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* === Shadows === */}
      <section aria-labelledby="shadows-heading" className="mb-16">
        <h2 id="shadows-heading" className="font-display text-28 mb-6">Sombras</h2>
        <div className="flex flex-wrap gap-8">
          {(
            [
              { cls: "shadow-md", label: "shadow-md" },
              { cls: "shadow-lg", label: "shadow-lg" },
            ] as const
          ).map((s) => (
            <div key={s.cls} className="flex flex-col items-center gap-2">
              <div className={`w-48 h-32 bg-surface rounded-lg border border-border ${s.cls}`} />
              <span className="text-12 text-muted font-mono">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* === Layout sizes === */}
      <section aria-labelledby="layout-heading" className="mb-16">
        <h2 id="layout-heading" className="font-display text-28 mb-6">Tamanhos de layout</h2>
        <div className="space-y-4">
          <div>
            <div className="w-rail h-tab bg-accent rounded-md" />
            <div className="text-12 text-muted font-mono mt-2">w-rail × h-tab — 64px × 64px</div>
          </div>
          <div>
            <div className="w-full h-tab bg-surface-elevated border border-border rounded-md" />
            <div className="text-12 text-muted font-mono mt-2">faixa h-tab — 64px de altura</div>
          </div>
        </div>
      </section>
    </main>
  );
}
