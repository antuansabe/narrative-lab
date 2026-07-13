import Link from "next/link";
import { APP_PHASE, MODEL_VERSION, SCHEMA_VERSION } from "@/lib/version";

const MODULES = [
  {
    id: "corpus",
    title: "Ingreso de corpus",
    desc: "Captura en lote de piezas narrativas — artículos, guiones, transcripciones — con metadatos de tipo de emisor y formato.",
    phase: "Fase 3",
    href: "/intake",
  },
  {
    id: "paradigms",
    title: "Paradigmas Hello World",
    desc: "Clasificación Ausente / Presente / Central en los cuatro paradigmas de Hello World, con una justificación breve y fundamentada por pieza.",
    phase: "Fase 4",
    href: "/ecosystem",
  },
  {
    id: "ecosystem",
    title: "Vista de ecosistema",
    desc: "Un radar para todo el corpus: superposición de mapa de calor, estadísticas de presencia, segmentación, y coherencia intra-autor.",
    phase: "Fases 5–6",
    href: "/ecosystem",
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
          Un espejo de cómo un ecosistema cuenta sus historias.
        </h1>
        <p className="mt-6 max-w-xl text-ink/70 leading-relaxed">
          Narrative Lab lee un corpus — no a una persona. Mapea dónde se
          concentra una comunidad de narradores, dónde se dispersa, y
          qué paradigmas de Hello World están presentes, ausentes o
          centrales a lo largo de todo el conjunto de textos.
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
                <span className="text-xs font-mono text-accent group-hover:text-primary transition underline">
                  Comenzar →
                </span>
              </>
            );

            return (
              <Link
                key={m.id}
                href={m.href}
                className="bg-paper p-6 hover:bg-primary-soft/10 transition group block"
              >
                {ArticleContent}
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between font-mono text-[11px] text-ink/40">
          <span>
            modelo {MODEL_VERSION} · esquema {SCHEMA_VERSION}
          </span>
          <a href="/api/health" className="hover:text-primary">
            /api/health
          </a>
        </div>
      </footer>
    </main>
  );
}
