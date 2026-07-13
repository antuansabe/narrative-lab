"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { countWords } from "@/lib/text";

interface Corpus {
  id: string;
  name: string;
}

interface PieceInput {
  title: string;
  text: string;
  genreTag: string;
  format: "article" | "audiovisual" | "social";
}

const GENRE_TAG_LABELS = {
  "free-form-interview": "Entrevista libre (free-form-interview)",
  "structured-profile": "Perfil estructurado (structured-profile)",
  "social-media-post": "Post de red social (social-media-post)",
  "institutional-report": "Reporte institucional (institutional-report)",
  "speech-public-address": "Discurso / Presentación (speech-public-address)",
  "fundraising-copy": "Texto de recaudación (fundraising-copy)",
};

export default function IntakePage() {
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [selectedCorpusId, setSelectedCorpusId] = useState<string>("");
  const [newCorpusName, setNewCorpusName] = useState<string>("");
  const [showCreateCorpus, setShowCreateCorpus] = useState<boolean>(false);

  // Contributor details
  const [contributorName, setContributorName] = useState<string>("");
  const [senderType, setSenderType] = useState<"journalist" | "organization" | "other">("journalist");

  // Three pieces
  const [pieces, setPieces] = useState<PieceInput[]>([
    { title: "", text: "", genreTag: "free-form-interview", format: "article" },
    { title: "", text: "", genreTag: "free-form-interview", format: "article" },
    { title: "", text: "", genreTag: "free-form-interview", format: "article" },
  ]);
  const [activeTab, setActiveTab] = useState<number>(0);

  // UI state
  const [loadingCorpora, setLoadingCorpora] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [results, setResults] = useState<any[] | null>(null);

  // Fetch corpora on mount
  useEffect(() => {
    fetchCorpora();
  }, []);

  async function fetchCorpora() {
    try {
      setLoadingCorpora(true);
      const res = await fetch("/api/corpora");
      const data = await res.json();
      if (res.ok && data.corpora) {
        setCorpora(data.corpora);
        if (data.corpora.length > 0) {
          setSelectedCorpusId(data.corpora[0].id);
        } else {
          setShowCreateCorpus(true);
        }
      }
    } catch (err) {
      console.error("Error fetching corpora:", err);
    } finally {
      setLoadingCorpora(false);
    }
  }

  async function handleCreateCorpus(e: React.FormEvent) {
    e.preventDefault();
    if (!newCorpusName.trim()) return;

    try {
      const res = await fetch("/api/corpora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCorpusName }),
      });
      const data = await res.json();
      if (res.ok && data.corpus) {
        setCorpora((prev) => [...prev, data.corpus]);
        setSelectedCorpusId(data.corpus.id);
        setNewCorpusName("");
        setShowCreateCorpus(false);
      } else {
        alert(data.error || "Error creando el corpus.");
      }
    } catch (err) {
      console.error("Error creating corpus:", err);
    }
  }

  function updatePiece(index: number, field: keyof PieceInput, value: string) {
    setPieces((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleIntakeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setResults(null);

    // Validation
    if (!selectedCorpusId) {
      setSubmitError("Debes seleccionar o crear un corpus.");
      return;
    }
    if (!contributorName.trim()) {
      setSubmitError("El nombre del colaborador es requerido.");
      return;
    }

    // Filter out completely empty pieces, but require at least 1, and warn if incomplete
    const activePieces = pieces.filter(
      (p) => p.title.trim() || p.text.trim()
    );

    if (activePieces.length === 0) {
      setSubmitError("Debes ingresar al menos una pieza narrativa.");
      return;
    }

    // Validate that active pieces are fully filled
    for (let i = 0; i < activePieces.length; i++) {
      const p = activePieces[i];
      if (!p.title.trim()) {
        setSubmitError(`La pieza #${i + 1} requiere un título.`);
        return;
      }
      if (!p.text.trim() || countWords(p.text) < 50) {
        setSubmitError(`El texto de la pieza #${i + 1} debe tener al menos 50 palabras.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setSubmitStatus("Analizando y registrando corpus...");

      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corpusId: selectedCorpusId,
          contributorName,
          senderType,
          pieces: activePieces,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.results);
        setSubmitStatus("✓ Procesamiento completo");
        // Reset form except corpus selection
        setContributorName("");
        setPieces([
          { title: "", text: "", genreTag: "free-form-interview", format: "article" },
          { title: "", text: "", genreTag: "free-form-interview", format: "article" },
          { title: "", text: "", genreTag: "free-form-interview", format: "article" },
        ]);
        setActiveTab(0);
      } else {
        setSubmitError(data.error || "Ocurrió un error al procesar las piezas.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError("Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCorpus = corpora.find((c) => c.id === selectedCorpusId);

  return (
    <main className="min-h-screen bg-paper pb-24 text-ink">
      <header className="border-b border-line">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-baseline justify-between">
          <Link href="/" className="font-display text-xl text-primary hover:opacity-80 transition">
            Narrative Lab
          </Link>
          <span className="font-mono text-xs text-ink/50">
            fase 3 — corpus intake
          </span>
        </div>
      </header>

      <div className="bg-amber-50 border-b border-amber-200 text-amber-800 py-2.5 px-6 text-center text-xs font-mono">
        ⚠️ Esta versión local todavía no tiene base de datos — nada de lo que se ingrese aquí se guarda de forma permanente.
      </div>

      <section className="mx-auto max-w-4xl px-6 pt-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl text-ink">Ingreso de Corpus (Lote)</h1>
          <p className="mt-2 text-ink/75 max-w-2xl text-sm leading-relaxed">
            Registra un nuevo colaborador y pega hasta tres piezas narrativas (artículos, transcripciones, posts) asociadas. El pipeline evaluará cada una con la matriz Ashoka de 5 dimensiones.
          </p>
        </div>

        {/* 1. Corpus Selection / Creation */}
        <div className="mb-8 p-6 bg-primary-soft/30 border border-line rounded-lg">
          <h2 className="font-display text-lg text-primary mb-3">1. Selección de Corpus</h2>
          {showCreateCorpus ? (
            <form onSubmit={handleCreateCorpus} className="flex gap-3 max-w-md items-end">
              <div className="flex-1">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink/60 mb-1">
                  Nombre del nuevo Corpus
                </label>
                <input
                  type="text"
                  placeholder="ej. Hola América 2026-07"
                  value={newCorpusName}
                  onChange={(e) => setNewCorpusName(e.target.value)}
                  className="w-full bg-paper border border-line px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="bg-primary text-paper px-4 py-2 text-sm font-medium hover:opacity-95 transition"
              >
                Crear
              </button>
              {corpora.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateCorpus(false)}
                  className="text-xs text-primary underline py-2"
                >
                  Cancelar
                </button>
              )}
            </form>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-64">
                <select
                  value={selectedCorpusId}
                  onChange={(e) => setSelectedCorpusId(e.target.value)}
                  className="w-full bg-paper border border-line px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  {corpora.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowCreateCorpus(true)}
                className="font-mono text-xs text-primary hover:opacity-80 transition underline"
              >
                + Crear nuevo corpus
              </button>
            </div>
          )}
        </div>

        {/* Results Banner */}
        {results && (
          <div className="mb-10 p-6 bg-paper border-2 border-accent rounded-lg">
            <h2 className="font-display text-2xl text-accent mb-4">✓ Análisis Completado</h2>
            <p className="text-sm text-ink/75 mb-6">
              Se han calificado y registrado las piezas narrativas para el colaborador. Resultados del lote:
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {results.map((r, idx) => (
                <div key={r.piece.id} className="p-4 bg-primary-soft/20 border border-line rounded">
                  <span className="font-mono text-[10px] text-accent uppercase tracking-wider block mb-1">
                    Pieza #{idx + 1}
                  </span>
                  <h3 className="font-display text-base text-ink mb-2 truncate">{r.piece.title}</h3>
                  <div className="flex justify-between items-baseline mb-3">
                    <span className="font-mono text-2xl font-bold text-primary">{r.scoreResult.enactmentScore}</span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-accent/20 text-ink rounded">
                      {r.scoreResult.paradigmName}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-ink/60 border-t border-line/60 pt-2">
                    <p>Orientación: {r.scoreResult.eachOrientation}</p>
                    <p className="mt-1">Palabras: {r.scoreResult.wordCount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Intake Form */}
        <form onSubmit={handleIntakeSubmit}>
          {/* 2. Contributor details */}
          <div className="mb-8 p-6 bg-paper border border-line rounded-lg">
            <h2 className="font-display text-lg text-primary mb-4">2. Identidad del Colaborador</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink/60 mb-1">
                  Nombre del Colaborador / Participante
                </label>
                <input
                  type="text"
                  placeholder="ej. Lucía Fernández"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  className="w-full bg-paper border border-line px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <span className="block font-mono text-[11px] uppercase tracking-wider text-ink/60 mb-2">
                  Tipo de Emisor (Segmentación)
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="senderType"
                      value="journalist"
                      checked={senderType === "journalist"}
                      onChange={() => setSenderType("journalist")}
                      className="accent-primary"
                    />
                    Periodista
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="senderType"
                      value="organization"
                      checked={senderType === "organization"}
                      onChange={() => setSenderType("organization")}
                      className="accent-primary"
                    />
                    Organización
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="senderType"
                      value="other"
                      checked={senderType === "other"}
                      onChange={() => setSenderType("other")}
                      className="accent-primary"
                    />
                    Otro
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Pieces Paste UI */}
          <div className="mb-8 p-6 bg-paper border border-line rounded-lg">
            <h2 className="font-display text-lg text-primary mb-4">3. Contenido Narrativo (Lote de hasta 3 piezas)</h2>
            <p className="text-xs text-ink/60 mb-4">
              Cada pieza representa una narrativa (ej. una entrevista transcrita, un artículo escrito, o un post).
            </p>

            {/* Tabs header */}
            <div className="flex border-b border-line mb-6">
              {pieces.map((p, idx) => {
                const count = countWords(p.text);
                const isFilled = p.title.trim() || p.text.trim();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-5 py-3 text-sm font-mono border-t-2 border-x -mb-px transition flex items-center gap-2 ${
                      activeTab === idx
                        ? "border-t-primary border-x-line bg-paper text-primary font-medium"
                        : "border-t-transparent border-x-transparent text-ink/50 hover:text-ink"
                    }`}
                  >
                    Pieza #{idx + 1}
                    {isFilled && (
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    )}
                    {count > 0 && (
                      <span className="text-[10px] text-ink/40">({count} pal.)</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab contents */}
            {pieces.map((p, idx) => {
              if (activeTab !== idx) return null;
              return (
                <div key={idx} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-ink/60 mb-1">
                        Título de la pieza
                      </label>
                      <input
                        type="text"
                        placeholder="ej. Entrevista sobre migración en Iztapalapa"
                        value={p.title}
                        onChange={(e) => updatePiece(idx, "title", e.target.value)}
                        className="w-full bg-paper border border-line px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-ink/60 mb-1">
                        Formato del material
                      </label>
                      <select
                        value={p.format}
                        onChange={(e) => updatePiece(idx, "format", e.target.value as any)}
                        className="w-full bg-paper border border-line px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="article">Artículo escrito</option>
                        <option value="audiovisual">Audiovisual (Video/Radio)</option>
                        <option value="social">Post de Red Social</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-ink/60 mb-1 flex justify-between">
                      <span>Calibración de pesos (Matriz)</span>
                      <span className="text-accent">Requerido para scoring</span>
                    </label>
                    <select
                      value={p.genreTag}
                      onChange={(e) => updatePiece(idx, "genreTag", e.target.value)}
                      className="w-full bg-paper border border-line px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    >
                      {Object.entries(GENRE_TAG_LABELS).map(([tag, label]) => (
                        <option key={tag} value={tag}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-ink/60 mb-1">
                      Texto fuente
                    </label>
                    <textarea
                      placeholder="Pega el texto original aquí (mínimo 50 palabras)..."
                      rows={12}
                      value={p.text}
                      onChange={(e) => updatePiece(idx, "text", e.target.value)}
                      className="w-full bg-paper border border-line px-3 py-2 text-sm font-sans focus:outline-none focus:border-primary leading-relaxed"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Errors and Progress */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              ❌ {submitError}
            </div>
          )}

          {isSubmitting && (
            <div className="mb-6 p-4 bg-primary-soft/40 border border-primary/20 text-primary text-sm font-mono rounded-lg flex items-center gap-3">
              <span className="animate-spin block w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              {submitStatus}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center">
            <Link href="/" className="text-sm text-ink/60 hover:text-primary transition underline font-mono">
              ← Volver al inicio
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-paper px-8 py-3 text-sm font-medium hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition rounded shadow-sm"
            >
              {isSubmitting ? "Analizando..." : "Registrar y Procesar Lote"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
