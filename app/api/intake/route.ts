import { NextResponse } from "next/server";
import { createContributor, createPiece, createAnalysis, createParadigmClassification } from "@/lib/db/mockStore";
import { callClaudeWithCachedSystem } from "@/lib/anthropic";
import { SCORER_SYSTEM_PROMPT } from "@/lib/prompts/scorer";
import { validateAndComputeScore } from "@/lib/scoring";
import { runClassification } from "@/lib/classifier";
import { countWords } from "@/lib/text";
import { MODEL_VERSION, SCHEMA_VERSION } from "@/lib/version";
import type { GenreTag } from "@/lib/types";

const VALID_GENRE_TAGS: GenreTag[] = [
  "free-form-interview",
  "structured-profile",
  "social-media-post",
  "institutional-report",
  "speech-public-address",
  "fundraising-copy",
  "journalistic-article",
];

const VALID_FORMATS = ["article", "audiovisual", "social"];
const VALID_SENDER_TYPES = ["journalist", "organization", "other"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { corpusId, contributorName, senderType, pieces } = body;

    // --- Validation ---
    if (!corpusId || typeof corpusId !== "string") {
      return NextResponse.json({ error: "Falta el ID del corpus o no es válido." }, { status: 400 });
    }
    if (!contributorName || typeof contributorName !== "string" || contributorName.trim() === "") {
      return NextResponse.json({ error: "Falta el nombre del colaborador o no es válido." }, { status: 400 });
    }
    if (!senderType || !VALID_SENDER_TYPES.includes(senderType)) {
      return NextResponse.json({ error: `Tipo de emisor no válido. Debe ser uno de: ${VALID_SENDER_TYPES.join(", ")}` }, { status: 400 });
    }
    if (!pieces || !Array.isArray(pieces) || pieces.length === 0 || pieces.length > 3) {
      return NextResponse.json({ error: "Las piezas deben ser una lista de 1 a 3 elementos." }, { status: 400 });
    }

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!p.title || typeof p.title !== "string" || p.title.trim() === "") {
        return NextResponse.json({ error: `La pieza ${i + 1} tiene un título no válido.` }, { status: 400 });
      }
      if (!p.text || typeof p.text !== "string" || countWords(p.text) < 50) {
        return NextResponse.json({ error: `El texto de la pieza ${i + 1} es demasiado corto. Mínimo 50 palabras.` }, { status: 400 });
      }
      if (!p.genreTag || !VALID_GENRE_TAGS.includes(p.genreTag as GenreTag)) {
        return NextResponse.json({ error: `La pieza ${i + 1} tiene un género no válido.` }, { status: 400 });
      }
      if (!p.format || !VALID_FORMATS.includes(p.format)) {
        return NextResponse.json({ error: `La pieza ${i + 1} tiene un formato no válido.` }, { status: 400 });
      }
    }

    // --- Create Contributor ---
    const contributor = await createContributor(corpusId, contributorName, senderType);

    // --- Process Pieces & Score them ---
    const results = [];
    for (const p of pieces) {
      const words = countWords(p.text);
      let rawJson = "";
      let scoringResult = null;
      let errorOccurred = false;
      let errorMessage = "";

      try {
        const response = await callClaudeWithCachedSystem({
          model: "claude-sonnet-4-6",
          systemPrompt: SCORER_SYSTEM_PROMPT,
          userMessage: p.text,
          maxTokens: 4000,
          temperature: 0,
        });
        rawJson = response.text;
      } catch (err: any) {
        console.error(`[api/intake] Error scoring piece "${p.title}":`, err);
        errorOccurred = true;
        errorMessage = err.message || "No se pudo contactar el servicio de calificación de Claude.";
      }

      if (!errorOccurred) {
        const validation = validateAndComputeScore(rawJson, words);
        if (validation.ok) {
          scoringResult = validation.result;
        } else {
          errorOccurred = true;
          errorMessage = validation.detail || "Claude devolvió una estructura de calificación mal formada.";
        }
      }

      // Save the piece record regardless (or if we failed, we flag it. Let's save if successful, or we can abort. Let's fail the intake transaction if scoring fails so the user can correct the input or retry.)
      if (errorOccurred) {
        return NextResponse.json({
          error: `No se pudo calificar la pieza "${p.title}": ${errorMessage}`
        }, { status: 502 });
      }

      const savedPiece = await createPiece(
        corpusId,
        contributor.id,
        p.title,
        p.text,
        p.genreTag as GenreTag,
        p.format as "article" | "audiovisual" | "social"
      );

      const savedAnalysis = await createAnalysis(
        savedPiece.id,
        scoringResult!.enactmentScore,
        scoringResult!.dimensions.D1.score,
        scoringResult!.dimensions.D2.score,
        scoringResult!.dimensions.D3.score,
        scoringResult!.dimensions.D4.score,
        scoringResult!.dimensions.D5.score,
        scoringResult!.eachOrientation,
        p.genreTag as GenreTag,
        rawJson,
        SCHEMA_VERSION,
        MODEL_VERSION
      );

      // Run Hello World paradigm classification
      let classifications = null;
      try {
        classifications = await runClassification(p.text);
        await Promise.all([
          createParadigmClassification(savedPiece.id, "paradigm1", classifications.paradigm1.level, classifications.paradigm1.justification, MODEL_VERSION),
          createParadigmClassification(savedPiece.id, "paradigm2", classifications.paradigm2.level, classifications.paradigm2.justification, MODEL_VERSION),
          createParadigmClassification(savedPiece.id, "paradigm3", classifications.paradigm3.level, classifications.paradigm3.justification, MODEL_VERSION),
          createParadigmClassification(savedPiece.id, "paradigm4", classifications.paradigm4.level, classifications.paradigm4.justification, MODEL_VERSION),
        ]);
      } catch (err: any) {
        console.error(`[api/intake] Hello World classification failed for piece "${p.title}":`, err);
      }

      results.push({
        piece: savedPiece,
        analysis: savedAnalysis,
        scoreResult: scoringResult,
        classifications
      });
    }

    return NextResponse.json({
      success: true,
      contributor,
      results
    }, { status: 201 });
  } catch (err: any) {
    console.error("[api/intake] Batch intake error:", err);
    return NextResponse.json({ error: err.message || "Ocurrió un error inesperado durante el ingreso en lote." }, { status: 500 });
  }
}
