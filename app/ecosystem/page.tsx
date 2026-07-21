"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EcosystemRadar } from "@/components/EcosystemRadar";
import { SegmentationRadar } from "@/components/SegmentationRadar";
import { PieceDetail } from "@/components/PieceDetail";
import { PARADIGM_LABELS } from "@/lib/helloWorldParadigms";

interface Corpus {
  id: string;
  name: string;
}

interface Piece {
  id: string;
  title: string;
  contributorId: string;
  genreTag: string;
  format: string;
}

interface Contributor {
  id: string;
  name: string;
  senderType: string;
}

interface Analysis {
  id: string;
  pieceId: string;
  enactmentScore: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  modelVersion: string;
  schemaVersion: string;
  rawJson: string;
}

interface ParadigmClassification {
  id: string;
  pieceId: string;
  paradigm: "paradigm1" | "paradigm2" | "paradigm3" | "paradigm4";
  level: "absent" | "present" | "central";
  justification: string;
}

interface CorpusSummary {
  topProblems: { problem: string; evidence: string }[];
  topProposals: { proposal: string; evidence: string }[];
  worldviewReinforcement: string;
  worldviewOpportunity: string;
}

interface EcosystemData {
  corpus: Corpus;
  piecesCount: number;
  analyzedCount: number;
  contributorsCount: number;
  stats: {
    dimensions: {
      D1: { mean: number; stdDev: number };
      D2: { mean: number; stdDev: number };
      D3: { mean: number; stdDev: number };
      D4: { mean: number; stdDev: number };
      D5: { mean: number; stdDev: number };
    };
    paradigms: {
      [key: string]: {
        absent: number;
        present: number;
        central: number;
        pctAbsent: number;
        pctPresent: number;
        pctCentral: number;
      };
    };
    versionMismatch: {
      count: number;
      currentModel: string;
      currentSchema: string;
    };
    segmentation: {
      senderType: {
        journalist: Record<string, number> | null;
        organization: Record<string, number> | null;
        other: Record<string, number> | null;
      };
      format: {
        article: Record<string, number> | null;
        audiovisual: Record<string, number> | null;
        social: Record<string, number> | null;
      };
    };
    coherence: Array<{
      contributorId: string;
      name: string;
      senderType: string;
      piecesCount: number;
      scores: number[];
      meanScore: number;
      stdDev: number;
      coherenceLevel: "alta" | "media" | "divergente" | "n/a";
    }>;
  };
  pieces: Piece[];
  contributors: Contributor[];
  analyses: Analysis[];
  classifications: ParadigmClassification[];
}

function EcosystemPageInner() {
  const searchParams = useSearchParams();
  const requestedCorpusId = searchParams.get("corpus");
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [selectedCorpusId, setSelectedCorpusId] = useState<string>("");
  const [data, setData] = useState<EcosystemData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [facilitatorMode, setFacilitatorMode] = useState<boolean>(false);
  const [expandedPieceId, setExpandedPieceId] = useState<string | null>(null);
  const [expandedAuthorId, setExpandedAuthorId] = useState<string | null>(null);
  const [expandedAuthorPieceId, setExpandedAuthorPieceId] = useState<string | null>(null);
  const [segmentCategory, setSegmentCategory] = useState<"senderType" | "format">("senderType");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [corpusSummary, setCorpusSummary] = useState<CorpusSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [summaryError, setSummaryError] = useState<string>("");

  async function handleGenerateSummary() {
    if (!selectedCorpusId) return;
    setSummaryStatus("loading");
    setSummaryError("");
    try {
      const res = await fetch(`/api/corpora/${selectedCorpusId}/summary`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setSummaryError(json.error || "No se pudo generar el resumen.");
        setSummaryStatus("error");
        return;
      }
      setCorpusSummary(json.summary);
      setSummaryStatus("done");
    } catch (err) {
      console.error("Error generating corpus summary:", err);
      setSummaryError("No se pudo conectar con el servidor.");
      setSummaryStatus("error");
    }
  }

  async function handleDownloadPdf() {
    const reportEl = document.getElementById("report-content");
    if (!reportEl || !data) return;
    setIsGeneratingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportEl, {
        scale: 2,
        backgroundColor: "#FAF7F1",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 48; // 24pt margin each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 24;
      pdf.addImage(imgData, "PNG", 24, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 48;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 24;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 24, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 48;
      }

      const safeName = data.corpus.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`narrative-lab-${safeName}-${dateStr}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const getSenderTypeSeries = () => {
    if (!data?.stats?.segmentation?.senderType) return [];
    const st = data.stats.segmentation.senderType;
    const series = [];
    if (st.journalist) {
      series.push({
        name: "Periodista",
        scores: st.journalist,
        color: "#E87722",
      });
    }
    if (st.organization) {
      series.push({
        name: "Organización",
        scores: st.organization,
        color: "#8B5CF6",
        strokeDasharray: "5 5",
      });
    }
    if (st.other) {
      series.push({
        name: "Otro",
        scores: st.other,
        color: "#06B6D4",
        strokeDasharray: "2 2",
      });
    }
    return series;
  };

  const getFormatSeries = () => {
    if (!data?.stats?.segmentation?.format) return [];
    const f = data.stats.segmentation.format;
    const series = [];
    if (f.article) {
      series.push({
        name: "Artículo",
        scores: f.article,
        color: "#E87722",
      });
    }
    if (f.audiovisual) {
      series.push({
        name: "Audiovisual",
        scores: f.audiovisual,
        color: "#8B5CF6",
        strokeDasharray: "5 5",
      });
    }
    if (f.social) {
      series.push({
        name: "Social",
        scores: f.social,
        color: "#06B6D4",
        strokeDasharray: "2 2",
      });
    }
    return series;
  };

  // Fetch corpora list
  useEffect(() => {
    async function fetchCorpora() {
      try {
        const res = await fetch("/api/corpora");
        const json = await res.json();
        if (res.ok && json.corpora) {
          setCorpora(json.corpora);
          if (requestedCorpusId && json.corpora.some((c: Corpus) => c.id === requestedCorpusId)) {
            setSelectedCorpusId(requestedCorpusId);
          } else if (json.corpora.length > 0) {
            setSelectedCorpusId(json.corpora[0].id);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error fetching corpora:", err);
        setLoading(false);
      }
    }
    fetchCorpora();
  }, []);

  // Fetch ecosystem statistics when selectedCorpusId changes
  useEffect(() => {
    if (!selectedCorpusId) return;
    // A new corpus selection invalidates any previously generated summary.
    setCorpusSummary(null);
    setSummaryStatus("idle");
    setSummaryError("");

    async function fetchEcosystemData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/corpora/${selectedCorpusId}`);
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          console.error("Error fetching ecosystem statistics:", json.error);
        }
      } catch (err) {
        console.error("Error fetching ecosystem details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEcosystemData();
  }, [selectedCorpusId]);

  return (
    <main className="min-h-screen bg-paper pb-24 text-ink">
      <header className="border-b border-line print:hidden">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-baseline justify-between">
          <Link href="/" className="font-display text-xl text-primary hover:opacity-80 transition">
            Narrative Lab
          </Link>
          <span className="font-mono text-xs text-ink/50">
            Vista del Ecosistema
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Selector de Corpus */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-zinc-50 border border-zinc-200 rounded-xl p-4 print:hidden">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
              Seleccionar Corpus
            </label>
            {corpora.length > 0 ? (
              <select
                value={selectedCorpusId}
                onChange={(e) => setSelectedCorpusId(e.target.value)}
                className="bg-white border border-zinc-300 rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary w-64"
              >
                {corpora.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-zinc-500">No se encontraron corpora. Ingresa piezas en Corpus Intake primero.</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-mono font-medium rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
              title="Descargar este reporte como archivo PDF"
            >
              <span>⬇️</span> {isGeneratingPdf ? "Generando PDF…" : "Descargar Reporte (PDF)"}
            </button>
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={facilitatorMode}
                onChange={(e) => setFacilitatorMode(e.target.checked)}
                className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4"
              />
              Modo Facilitador
            </label>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-sm text-zinc-400">Calculando estadísticas y analizando coherencia...</span>
          </div>
        )}

        {!loading && !data && (
          <div className="text-center py-12 border border-dashed border-zinc-200 rounded-xl">
            <p className="text-zinc-500 text-sm">Selecciona o registra un corpus para visualizar el ecosistema.</p>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-8" id="report-content">
            {/* Encabezado de reporte — siempre visible, identifica el corpus y la fecha tanto en pantalla como en el PDF */}
            <div className="mb-6">
              <h1 className="font-display text-2xl text-ink">Narrative Lab — Reporte de Ecosistema</h1>
              <p className="text-sm text-zinc-600 mt-1">
                Corpus: <strong>{data.corpus.name}</strong> · Generado el{" "}
                {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                {facilitatorMode ? " · Incluye desglose por pieza (Modo Facilitador)" : ""}
              </p>
            </div>

            {/* Resumen del Ecosistema (IA, on-demand) */}
            <div className="border border-zinc-200 bg-white rounded-xl p-6 shadow-sm print:break-inside-avoid">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                    Resumen del Ecosistema
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Problemas y propuestas más destacados en el corpus, y cómo su cobertura refuerza — o podría fortalecer — el changemaker worldview.
                  </p>
                </div>
                {summaryStatus !== "loading" && (
                  <button
                    onClick={handleGenerateSummary}
                    className="shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-mono font-medium rounded shadow-sm hover:opacity-90 transition print:hidden"
                  >
                    {summaryStatus === "done" ? "Regenerar resumen" : "Generar resumen"}
                  </button>
                )}
              </div>

              {summaryStatus === "loading" && (
                <p className="text-xs text-zinc-400 italic py-4">
                  Leyendo el corpus y generando el resumen — puede tardar hasta un minuto…
                </p>
              )}

              {summaryStatus === "error" && (
                <p className="text-xs text-red-600 py-2">{summaryError}</p>
              )}

              {summaryStatus === "done" && corpusSummary && (
                <div className="mt-3 space-y-5 text-sm">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                      Problemas más destacados
                    </h4>
                    <ul className="space-y-2">
                      {corpusSummary.topProblems.map((item, i) => (
                        <li key={i} className="text-zinc-700 leading-relaxed">
                          {item.problem}{" "}
                          <span className="text-xs text-zinc-400 italic">— {item.evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                      Propuestas más enfatizadas
                    </h4>
                    <ul className="space-y-2">
                      {corpusSummary.topProposals.map((item, i) => (
                        <li key={i} className="text-zinc-700 leading-relaxed">
                          {item.proposal}{" "}
                          <span className="text-xs text-zinc-400 italic">— {item.evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                        Cómo refuerza el changemaker worldview
                      </h4>
                      <p className="text-zinc-700 leading-relaxed text-xs">{corpusSummary.worldviewReinforcement}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                        Dónde podría fortalecerlo
                      </h4>
                      <p className="text-zinc-700 leading-relaxed text-xs">{corpusSummary.worldviewOpportunity}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-zinc-400">Piezas</span>
                <span className="text-3xl font-display text-zinc-800">{data.piecesCount}</span>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-zinc-400">Analizadas</span>
                <span className="text-3xl font-display text-zinc-800">{data.analyzedCount}</span>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-zinc-400">Colaboradores</span>
                <span className="text-3xl font-display text-zinc-800">{data.contributorsCount}</span>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-zinc-400">Discrepancias</span>
                <span className={`text-3xl font-display ${data.stats.versionMismatch.count > 0 ? "text-amber-500" : "text-zinc-800"}`}>
                  {data.stats.versionMismatch.count}
                </span>
              </div>
            </div>

            {/* Alerta de versión mismatch */}
            {data.stats.versionMismatch.count > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="font-semibold">Inconsistencia de Versión Detectada</h4>
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                    Hay {data.stats.versionMismatch.count} pieza(s) en este corpus analizadas con modelos o esquemas obsoletos. El sistema actual espera el modelo <strong>{data.stats.versionMismatch.currentModel}</strong> y el esquema <strong>{data.stats.versionMismatch.currentSchema}</strong>. Re-analiza estas piezas para asegurar la integridad de la vista agregada.
                  </p>
                </div>
              </div>
            )}

            {/* Fila principal: Radar y Paradigmas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Radar del ecosistema */}
              <EcosystemRadar dimensions={data.stats.dimensions} />

              {/* Estadísticas de Paradigmas Hello World */}
              <div className="border border-zinc-200 bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Distribución de Paradigmas Hello World
                  </h3>
                  <p className="text-xs text-zinc-400 mb-6">
                    Porcentaje de presencia y centralidad de los 4 paradigmas narrativos de migración de Hello World.
                  </p>
                </div>

                <div className="space-y-6">
                  {Object.entries(PARADIGM_LABELS).map(([key, label]) => {
                    const stats = data.stats.paradigms[key] || { pctAbsent: 100, pctPresent: 0, pctCentral: 0 };
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xs font-semibold text-zinc-700">{label.title}</h4>
                          <span className="text-[10px] font-mono text-zinc-400">
                            C: {stats.pctCentral}% | P: {stats.pctPresent}% | A: {stats.pctAbsent}%
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal">{label.desc}</p>
                        
                        {/* Barra acumulativa apilada */}
                        <div className="h-3 w-full rounded-full bg-zinc-100 flex overflow-hidden">
                          {stats.pctCentral > 0 && (
                            <div
                              style={{ width: `${stats.pctCentral}%` }}
                              className="bg-amber-400 h-full hover:opacity-90 transition-opacity"
                              title={`Central: ${stats.pctCentral}%`}
                            />
                          )}
                          {stats.pctPresent > 0 && (
                            <div
                              style={{ width: `${stats.pctPresent}%` }}
                              className="bg-indigo-400 h-full hover:opacity-90 transition-opacity"
                              title={`Presente: ${stats.pctPresent}%`}
                            />
                          )}
                          {stats.pctAbsent > 0 && (
                            <div
                              style={{ width: `${stats.pctAbsent}%` }}
                              className="bg-zinc-300 h-full hover:opacity-90 transition-opacity"
                              title={`Ausente: ${stats.pctAbsent}%`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex gap-4 text-[10px] font-mono justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
                    <span className="text-zinc-500">Central</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-400"></span>
                    <span className="text-zinc-500">Presente</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-300"></span>
                    <span className="text-zinc-500">Ausente</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila: Segmentación y Comparaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Radar de Segmentación */}
              <div>
                <div className="flex items-center justify-between mb-4 bg-zinc-50 border border-zinc-200 rounded-xl p-2 px-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Segmentación
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSegmentCategory("senderType")}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                        segmentCategory === "senderType"
                          ? "bg-primary text-white"
                          : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      Remitente
                    </button>
                    <button
                      onClick={() => setSegmentCategory("format")}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                        segmentCategory === "format"
                          ? "bg-primary text-white"
                          : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      Formato
                    </button>
                  </div>
                </div>

                <SegmentationRadar
                  title={
                    segmentCategory === "senderType"
                      ? "Comparación por Tipo de Remitente"
                      : "Comparación por Formato de Pieza"
                  }
                  subtitle={
                    segmentCategory === "senderType"
                      ? "Compara perfiles promedio de Periodistas, Organizaciones y Otros."
                      : "Compara perfiles promedio de Artículos, Audiovisuales y Redes Sociales."
                  }
                  series={
                    segmentCategory === "senderType"
                      ? getSenderTypeSeries()
                      : getFormatSeries()
                  }
                />
              </div>

              {/* Coherencia Intra-Autor */}
              <div className="border border-zinc-200 bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                      Coherencia Intra-Autor
                    </h3>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded self-start">
                      provisional — pendiente de validación de Giselle
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">
                    Mide la variación de los relatos creados por el mismo autor para identificar consistencia o divergencia narrativa.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-zinc-100 text-zinc-400 uppercase tracking-wider font-mono">
                        <th className="py-2">Autor</th>
                        <th className="py-2 text-center">Piezas</th>
                        <th className="py-2 text-center">Promedio</th>
                        <th className="py-2 text-center">Desviación (σ)</th>
                        <th className="py-2 text-right">Coherencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 text-zinc-700 font-medium">
                      {data.stats.coherence.map((author) => {
                        let badgeClass = "bg-zinc-100 text-zinc-500";
                        let label = "N/A";

                        if (author.coherenceLevel === "alta") {
                          badgeClass = "bg-green-100 text-green-800";
                          label = "Alta";
                        } else if (author.coherenceLevel === "media") {
                          badgeClass = "bg-amber-100 text-amber-800";
                          label = "Media";
                        } else if (author.coherenceLevel === "divergente") {
                          badgeClass = "bg-red-100 text-red-800 animate-pulse";
                          label = "Divergente";
                        } else {
                          label = "N/A";
                        }

                        return (
                          <tr key={author.contributorId} className="hover:bg-zinc-50/30">
                            <td className="py-2.5 max-w-[120px] truncate" title={author.name}>
                              {author.name}
                            </td>
                            <td className="py-2.5 text-center font-mono">{author.piecesCount}</td>
                            <td className="py-2.5 text-center font-mono">{author.meanScore}</td>
                            <td className="py-2.5 text-center font-mono">
                              {author.piecesCount > 1 ? author.stdDev : "-"}
                            </td>
                            <td className="py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${badgeClass}`}>
                                {label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {data.stats.coherence.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-zinc-400 italic">
                            No se encontraron colaboradores registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 text-[10px] text-zinc-400 leading-normal">
                  💡 <strong>Divergente (σ &gt; 25)</strong>: Indica un "outlier narrativo" que emplea marcos de cambio sistémico en una pieza pero cae en marcos puramente asistenciales en otra.
                </div>
              </div>
            </div>

            {/* Score agregado por colaborador, con drill-down a pieza + citas */}
            <div className="border border-zinc-200 bg-white rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Score Agregado por Colaborador
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Haz clic en un colaborador para ver sus piezas; haz clic en una pieza para ver sus puntuaciones, justificaciones y citas textuales.
                </p>
              </div>
              <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
                {data.contributors
                  .map((contributor) => {
                    const authorPieces = data.pieces.filter((p) => p.contributorId === contributor.id);
                    const scores = authorPieces
                      .map((p) => data.analyses.find((a) => a.pieceId === p.id)?.enactmentScore)
                      .filter((s): s is number => typeof s === "number");
                    const meanScore = scores.length > 0
                      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
                      : 0;
                    return { contributor, authorPieces, meanScore };
                  })
                  .sort((a, b) => b.meanScore - a.meanScore)
                  .map(({ contributor, authorPieces, meanScore }) => {
                    const isAuthorExpanded = expandedAuthorId === contributor.id;
                    return (
                      <div key={contributor.id} className="transition hover:bg-zinc-50/50">
                        <div
                          onClick={() => {
                            setExpandedAuthorId(isAuthorExpanded ? null : contributor.id);
                            setExpandedAuthorPieceId(null);
                          }}
                          className="flex items-center justify-between p-4 cursor-pointer gap-2"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                              {contributor.senderType === "journalist" ? "Periodista" : contributor.senderType === "organization" ? "Organización" : "Otro"}
                            </span>
                            <h4 className="text-sm font-semibold text-zinc-700">{contributor.name}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-400">{authorPieces.length} pieza(s)</span>
                            <span className="text-sm font-semibold text-primary">Score: {meanScore}</span>
                            <span className="text-zinc-300 text-xs">{isAuthorExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {isAuthorExpanded && (
                          <div className="p-4 bg-zinc-50/30 border-t border-zinc-100 space-y-2">
                            {authorPieces.map((piece) => {
                              const analysis = data.analyses.find((a) => a.pieceId === piece.id);
                              const pieceClassifications = data.classifications.filter((pc) => pc.pieceId === piece.id);
                              const isPieceExpanded = expandedAuthorPieceId === piece.id;
                              return (
                                <div key={piece.id} className="border border-zinc-100 rounded-lg bg-white overflow-hidden">
                                  <div
                                    onClick={() => setExpandedAuthorPieceId(isPieceExpanded ? null : piece.id)}
                                    className="flex items-center justify-between p-3 cursor-pointer"
                                  >
                                    <h5 className="text-xs font-semibold text-zinc-700">{piece.title}</h5>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">
                                        {piece.genreTag}
                                      </span>
                                      <span className="text-xs font-semibold text-primary">
                                        {analysis?.enactmentScore ?? 0}
                                      </span>
                                      <span className="text-zinc-300 text-[10px]">{isPieceExpanded ? "▲" : "▼"}</span>
                                    </div>
                                  </div>
                                  {isPieceExpanded && (
                                    <div className="p-3 bg-zinc-50/30 border-t border-zinc-100 text-sm">
                                      <PieceDetail analysis={analysis} classifications={pieceClassifications} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {authorPieces.length === 0 && (
                              <p className="text-xs text-zinc-400 italic">Sin piezas registradas para este colaborador.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                {data.contributors.length === 0 && (
                  <p className="p-4 text-xs text-zinc-400 italic">No se encontraron colaboradores registrados.</p>
                )}
              </div>
            </div>

            {/* Modo Facilitador (C6 - per-piece drill down) */}
            {facilitatorMode && (
              <div className="border border-zinc-200 bg-white rounded-xl p-6 shadow-sm mt-8 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                    Modo Facilitador: Desglose por Pieza
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Acceso exclusivo para facilitadores. Haz clic en cualquier pieza para ver las justificaciones textuales y puntuaciones.
                  </p>
                </div>

                <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
                  {data.pieces.map((piece) => {
                    const analysis = data.analyses.find((a) => a.pieceId === piece.id);
                    const contributor = data.contributors.find((c) => c.id === piece.contributorId);
                    const pieceClassifications = data.classifications.filter((pc) => pc.pieceId === piece.id);
                    const isExpanded = expandedPieceId === piece.id;

                    return (
                      <div key={piece.id} className="transition hover:bg-zinc-50/50">
                        {/* Header de la pieza */}
                        <div
                          onClick={() => setExpandedPieceId(isExpanded ? null : piece.id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-2"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                              {contributor?.name || "Desconocido"} ({piece.format})
                            </span>
                            <h4 className="text-sm font-semibold text-zinc-700">{piece.title}</h4>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">
                              {piece.genreTag}
                            </span>
                            <span className="text-sm font-semibold text-primary">
                              Score: {analysis?.enactmentScore || 0}
                            </span>
                            <span className="text-zinc-300 text-xs">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </div>
                        </div>

                        {/* Contenido expandido */}
                        {isExpanded && (
                          <div className="p-4 bg-zinc-50/30 border-t border-zinc-100 text-sm">
                            <PieceDetail analysis={analysis} classifications={pieceClassifications} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function EcosystemPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-paper" />}>
      <EcosystemPageInner />
    </Suspense>
  );
}
