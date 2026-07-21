import { NextResponse } from "next/server";
import { readDb } from "@/lib/db/mockStore";
import { callClaudeWithCachedSystem } from "@/lib/anthropic";
import { CORPUS_SUMMARY_SYSTEM_PROMPT } from "@/lib/prompts/corpus-summary";
import { MODEL_VERSION } from "@/lib/version";

const MAX_CHARS_PER_PIECE = 3000;
const MAX_TOTAL_CHARS = 60000; // keeps the pilot-scale corpus well within a single call

interface SummaryOutput {
  topProblems: { problem: string; evidence: string }[];
  topProposals: { proposal: string; evidence: string }[];
  worldviewReinforcement: string;
  worldviewOpportunity: string;
}

function isValidSummaryShape(v: unknown): v is SummaryOutput {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.topProblems) &&
    Array.isArray(o.topProposals) &&
    typeof o.worldviewReinforcement === "string" &&
    typeof o.worldviewOpportunity === "string"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: corpusId } = await params;
    const db = await readDb();

    const corpus = db.corpora.find((c) => c.id === corpusId);
    if (!corpus) {
      return NextResponse.json({ error: `No se encontró el corpus con ID ${corpusId}.` }, { status: 404 });
    }

    const pieces = db.pieces.filter((p) => p.corpusId === corpusId);
    if (pieces.length === 0) {
      return NextResponse.json({ error: "Este corpus no tiene piezas para resumir." }, { status: 400 });
    }
    const contributors = db.contributors.filter((c) => c.corpusId === corpusId);
    const analyses = db.analyses.filter((a) => pieces.some((p) => p.id === a.pieceId));
    const classifications = db.paradigmClassifications.filter((pc) =>
      pieces.some((p) => p.id === pc.pieceId)
    );

    // --- Recompute paradigm distribution percentages (given to the model as fact) ---
    const PARADIGM_KEYS = ["paradigm1", "paradigm2", "paradigm3", "paradigm4"] as const;
    const paradigmStats: Record<string, { pctAbsent: number; pctPresent: number; pctCentral: number }> = {};
    for (const key of PARADIGM_KEYS) {
      const forKey = classifications.filter((pc) => pc.paradigm === key);
      const total = forKey.length;
      const absent = forKey.filter((pc) => pc.level === "absent").length;
      const present = forKey.filter((pc) => pc.level === "present").length;
      const central = forKey.filter((pc) => pc.level === "central").length;
      paradigmStats[key] = {
        pctAbsent: total > 0 ? Math.round((absent / total) * 1000) / 10 : 0,
        pctPresent: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
        pctCentral: total > 0 ? Math.round((central / total) * 1000) / 10 : 0,
      };
    }

    // --- Build the per-piece evidence block, capped ---
    let totalChars = 0;
    const pieceBlocks: string[] = [];
    for (const piece of pieces) {
      const contributor = contributors.find((c) => c.id === piece.contributorId);
      const analysis = analyses.find((a) => a.pieceId === piece.id);
      const excerpt = piece.text.slice(0, MAX_CHARS_PER_PIECE);
      const block = `--- PIEZA: "${piece.title}" ---
Colaborador: ${contributor?.name ?? "desconocido"} (${contributor?.senderType ?? "n/a"})
Género: ${piece.genreTag} | Enactment Score: ${analysis?.enactmentScore ?? "n/a"}
Texto:
${excerpt}${piece.text.length > MAX_CHARS_PER_PIECE ? " [...]" : ""}
`;
      if (totalChars + block.length > MAX_TOTAL_CHARS) break;
      pieceBlocks.push(block);
      totalChars += block.length;
    }

    const userMessage = `CORPUS: "${corpus.name}" (${pieces.length} piezas totales, ${pieceBlocks.length} incluidas en este resumen)

DISTRIBUCIÓN DE PARADIGMAS HELLO WORLD (dato calculado, no lo inventes ni lo redondees distinto):
${PARADIGM_KEYS.map((k) => `- ${k}: ${paradigmStats[k].pctAbsent}% ausente, ${paradigmStats[k].pctPresent}% presente, ${paradigmStats[k].pctCentral}% central`).join("\n")}

PIEZAS:
${pieceBlocks.join("\n")}`;

    const response = await callClaudeWithCachedSystem({
      model: MODEL_VERSION,
      systemPrompt: CORPUS_SUMMARY_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 2000,
      temperature: 0,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      console.error("[api/corpora/[id]/summary] Could not parse model output:", response.text.slice(0, 500));
      return NextResponse.json({ error: "El modelo devolvió una respuesta mal formada. Intenta de nuevo." }, { status: 502 });
    }
    if (!isValidSummaryShape(parsed)) {
      console.error("[api/corpora/[id]/summary] Invalid shape:", JSON.stringify(parsed).slice(0, 500));
      return NextResponse.json({ error: "El modelo devolvió una estructura inesperada. Intenta de nuevo." }, { status: 502 });
    }

    return NextResponse.json({
      summary: parsed,
      piecesIncluded: pieceBlocks.length,
      piecesTotal: pieces.length,
      modelVersion: MODEL_VERSION,
    }, { status: 200 });
  } catch (err: any) {
    console.error("[api/corpora/[id]/summary] Error:", err);
    return NextResponse.json({ error: err.message || "No se pudo generar el resumen del corpus." }, { status: 500 });
  }
}
