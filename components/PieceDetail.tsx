"use client";

import { DIMENSIONS } from "@/lib/paradigm";
import { PARADIGM_LABELS } from "@/lib/helloWorldParadigms";

interface DimensionRaw {
  score: number;
  justification: string;
  quotes: string[];
}

interface ScorerRawJson {
  dimensions?: Record<string, DimensionRaw>;
}

interface PieceDetailAnalysis {
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  enactmentScore: number;
  rawJson: string;
}

interface PieceDetailClassification {
  id: string;
  paradigm: "paradigm1" | "paradigm2" | "paradigm3" | "paradigm4";
  level: "absent" | "present" | "central";
  justification: string;
}

interface PieceDetailProps {
  analysis: PieceDetailAnalysis | undefined;
  classifications: PieceDetailClassification[];
}

/**
 * Shared per-piece evidence view: the five dimension scores WITH the
 * scorer's own justification + verbatim quotes (parsed from
 * analysis.rawJson — this data was always being generated and stored,
 * just never surfaced in the UI), plus the four Hello World paradigm
 * classifications with their justifications.
 *
 * Used by both the ecosystem page's Facilitator Mode per-piece list and
 * the per-contributor drill-down view — one implementation, so the two
 * surfaces can never drift apart.
 */
export function PieceDetail({ analysis, classifications }: PieceDetailProps) {
  let parsedDimensions: Record<string, DimensionRaw> | null = null;
  if (analysis?.rawJson) {
    try {
      const parsed: ScorerRawJson = JSON.parse(analysis.rawJson);
      parsedDimensions = parsed.dimensions ?? null;
    } catch {
      parsedDimensions = null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Puntuación por Dimensión, con justificación y citas */}
      <div>
        <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Puntuaciones por Dimensión
        </h5>
        <div className="space-y-3">
          {DIMENSIONS.map((dim) => {
            const scoreKey = dim.key.toLowerCase() as "d1" | "d2" | "d3" | "d4" | "d5";
            const val = analysis ? analysis[scoreKey] : 0;
            const raw = parsedDimensions?.[dim.key];
            return (
              <div key={dim.key} className="bg-white border border-zinc-100 rounded-lg p-3">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-semibold text-zinc-700">
                    {dim.key} — {dim.shortName}
                  </span>
                  <span className="text-sm font-bold" style={{ color: dim.color }}>
                    {val}/4
                  </span>
                </div>
                {raw?.justification && (
                  <p className="text-xs text-zinc-600 leading-relaxed mb-1.5">{raw.justification}</p>
                )}
                {raw?.quotes && raw.quotes.length > 0 && (
                  <div className="space-y-1 mt-1.5">
                    {raw.quotes.map((q, i) => (
                      <p
                        key={i}
                        className="text-xs italic text-zinc-500 pl-2 border-l-2 border-zinc-200"
                      >
                        "{q}"
                      </p>
                    ))}
                  </div>
                )}
                {!raw && (
                  <p className="text-xs text-zinc-400 italic">
                    Sin justificación textual disponible para esta dimensión.
                  </p>
                )}
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
          {classifications.map((pc) => {
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
          {classifications.length === 0 && (
            <p className="text-xs text-zinc-400 italic">
              No se han realizado clasificaciones de Hello World para esta pieza.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
