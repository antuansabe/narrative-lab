import Link from "next/link";
import { APP_PHASE, MODEL_VERSION, SCHEMA_VERSION } from "@/lib/version";

const MODULES = [
  {
    id: "corpus",
    title: "Corpus intake",
    desc: "Batch entry of narrative pieces — articles, scripts, transcripts — with sender type and format metadata.",
    phase: "Phase 3",
    href: "/intake",
  },
  {
    id: "paradigms",
    title: "Hello World paradigms",
    desc: "Absent / Present / Central classification across the four Hello World paradigms, with a brief grounded justification per piece.",
    phase: "Phase 4",
    href: null,
  },
  {
    id: "ecosystem",
    title: "Ecosystem view",
    desc: "One radar for the whole corpus: heat-map overlay, presence statistics, segmentation, and intra-author coherence.",
    phase: "Phases 5–6",
    href: null,
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-baseline justify-between">
          <span className="font-display text-xl text-primary">
            Narrative Lab
          </span>
          <span className="font-mono text-xs text-ink/50">
            {APP_PHASE.toLowerCase()}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-20 pb-14">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-6">
          Ashoka · Hello World · Hola América
        </p>
        <h1 className="font-display text-5xl leading-tight text-ink max-w-2xl">
          A mirror for how an ecosystem tells its stories.
        </h1>
        <p className="mt-6 max-w-xl text-ink/70 leading-relaxed">
          Narrative Lab reads a corpus — not a person. It maps where a
          community of storytellers concentrates, where it disperses, and
          which paradigms of Hello World are present, absent, or central
          across the whole body of work.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-px bg-line sm:grid-cols-3 border border-line">
          {MODULES.map((m) => {
            const ArticleContent = (
              <>
                <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-3">
                  {m.phase}
                </p>
                <h2 className="font-display text-lg text-ink mb-2">{m.title}</h2>
                <p className="text-sm text-ink/65 leading-relaxed mb-4">{m.desc}</p>
                {m.href ? (
                  <span className="text-xs font-mono text-accent group-hover:text-primary transition underline">
                    Comenzar →
                  </span>
                ) : (
                  <span className="text-xs font-mono text-ink/30 cursor-not-allowed">
                    Próximamente
                  </span>
                )}
              </>
            );

            return m.href ? (
              <Link
                key={m.id}
                href={m.href}
                className="bg-paper p-6 hover:bg-primary-soft/10 transition group block"
              >
                {ArticleContent}
              </Link>
            ) : (
              <article key={m.id} className="bg-paper p-6 opacity-80">
                {ArticleContent}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between font-mono text-[11px] text-ink/40">
          <span>
            model {MODEL_VERSION} · schema {SCHEMA_VERSION}
          </span>
          <a href="/api/health" className="hover:text-primary">
            /api/health
          </a>
        </div>
      </footer>
    </main>
  );
}
