"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EcosystemRadar } from "@/components/EcosystemRadar";
import { SegmentationRadar } from "@/components/SegmentationRadar";

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
}

interface ParadigmClassification {
  id: string;
  pieceId: string;
  paradigm: "paradigm1" | "paradigm2" | "paradigm3" | "paradigm4";
  level: "absent" | "present" | "central";
  justification: string;
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

const PARADIGM_LABELS = {
  paradigm1: {
    title: "1. Migrantes como Agentes de Cambio",
    desc: "Sujetos activos con capacidad de transformar su entorno frente a víctimas o amenazas pasivas.",
  },
  paradigm2: {
    title: "2. El Movimiento como Experiencia Compartida",
    desc: "Migración como fenómeno que conecta a toda la sociedad en lugar de ser exclusivo de 'los otros'.",
  },
  paradigm3: {
    title: "3. El Valor del Conocimiento Migrante",
    desc: "Visibilización de los saberes y aportes únicos de los migrantes más allá del valor laboral.",
  },
  paradigm4: {
    title: "4. Identidades Fluidas como Motor de Cambio",
    desc: "Reconocimiento de identidades transnacionales y dinámicas frente a etiquetas homogéneas.",
  },
};

export default function EcosystemPage() {
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [selectedCorpusId, setSelectedCorpusId] = useState<string>("");
  const [data, setData] = useState<EcosystemData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [facilitatorMode, setFacilitatorMode] = useState<boolean>(false);
  const [expandedPieceId, setExpandedPieceId] = useState<string | null>(null);
  const [segmentCategory, setSegmentCategory] = useState<"senderType" | "format">("senderType");

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
          if (json.corpora.length > 0) {
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
            fase 5 — vista del ecosistema
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
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-mono font-medium rounded shadow-sm flex items-center gap-1.5"
              title="Guardar como PDF o Imprimir reporte"
            >
              <span>🖨️</span> Imprimir Reporte
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
          <div className="space-y-8">
            {/* Encabezado de reporte — solo visible al imprimir, para que el PDF se identifique a sí mismo */}
            <div className="hidden print:block mb-6">
              <h1 className="font-display text-2xl text-ink">Narrative Lab — Reporte de Ecosistema</h1>
              <p className="text-sm text-zinc-600 mt-1">
                Corpus: <strong>{data.corpus.name}</strong> · Generado el{" "}
                {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                {facilitatorMode ? " · Incluye desglose por pieza (Modo Facilitador)" : ""}
              </p>
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
                          <div className="p-4 bg-zinc-50/30 border-t border-zinc-100 space-y-6 text-sm">
                            {/* Puntuación por Dimensión */}
                            <div className="bg-white border border-zinc-100 rounded-lg p-4">
                              <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                Puntuaciones por Dimensión
                              </h5>
                              <div className="grid grid-cols-5 gap-2 text-center">
                                {["D1", "D2", "D3", "D4", "D5"].map((dim) => {
                                  const scoreKey = dim.toLowerCase() as "d1" | "d2" | "d3" | "d4" | "d5";
                                  const val = analysis ? analysis[scoreKey] : 0;
                                  return (
                                    <div key={dim} className="border border-zinc-100 p-2 rounded">
                                      <span className="block text-[10px] font-mono text-zinc-400">{dim}</span>
                                      <span className="text-lg font-bold text-zinc-700">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Clasificación de Paradigmas Hello World */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Paradigmas Hello World
                              </h5>
                              <div className="grid grid-cols-1 gap-3">
                                {pieceClassifications.map((pc) => {
                                  const label = PARADIGM_LABELS[pc.paradigm];
                                  const isCentral = pc.level === "central";
                                  const isPresent = pc.level === "present";
                                  
                                  const badgeClass = isCentral
                                    ? "bg-amber-100 text-amber-800"
                                    : isPresent
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-zinc-100 text-zinc-500";

                                  return (
                                    <div key={pc.id} className="bg-white border border-zinc-100 rounded-lg p-3 space-y-2">
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-xs font-semibold text-zinc-700">{label.title}</span>
                                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${badgeClass}`}>
                                          {pc.level === "central" ? "Central" : pc.level === "present" ? "Presente" : "Ausente"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-600 leading-relaxed pl-1 border-l-2 border-zinc-200">
                                        {pc.justification}
                                      </p>
                                    </div>
                                  );
                                })}
                                {pieceClassifications.length === 0 && (
                                  <p className="text-xs text-zinc-400 italic">No se han realizado clasificaciones de Hello World para esta pieza.</p>
                                )}
                              </div>
                            </div>
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
