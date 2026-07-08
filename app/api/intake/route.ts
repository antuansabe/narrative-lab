import { NextResponse } from "next/server";
import { createContributor, createPiece, createAnalysis } from "@/lib/db/mockStore";
import { callClaudeWithCachedSystem } from "@/lib/anthropic";
import { SCORER_SYSTEM_PROMPT } from "@/lib/prompts/scorer";
import { validateAndComputeScore } from "@/lib/scoring";
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
];

const VALID_FORMATS = ["article", "audiovisual", "social"];
const VALID_SENDER_TYPES = ["journalist", "organization", "other"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { corpusId, contributorName, senderType, pieces } = body;

    // --- Validation ---
    if (!corpusId || typeof corpusId !== "string") {
      return NextResponse.json({ error: "Missing or invalid corpusId." }, { status: 400 });
    }
    if (!contributorName || typeof contributorName !== "string" || contributorName.trim() === "") {
      return NextResponse.json({ error: "Missing or invalid contributorName." }, { status: 400 });
    }
    if (!senderType || !VALID_SENDER_TYPES.includes(senderType)) {
      return NextResponse.json({ error: `Invalid senderType. Must be one of: ${VALID_SENDER_TYPES.join(", ")}` }, { status: 400 });
    }
    if (!pieces || !Array.isArray(pieces) || pieces.length === 0 || pieces.length > 3) {
      return NextResponse.json({ error: "Pieces must be an array of 1 to 3 items." }, { status: 400 });
    }

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!p.title || typeof p.title !== "string" || p.title.trim() === "") {
        return NextResponse.json({ error: `Piece ${i + 1} has an invalid title.` }, { status: 400 });
      }
      if (!p.text || typeof p.text !== "string" || countWords(p.text) < 50) {
        return NextResponse.json({ error: `Piece ${i + 1} text is too short. Minimum 50 words.` }, { status: 400 });
      }
      if (!p.genreTag || !VALID_GENRE_TAGS.includes(p.genreTag as GenreTag)) {
        return NextResponse.json({ error: `Piece ${i + 1} has an invalid genreTag.` }, { status: 400 });
      }
      if (!p.format || !VALID_FORMATS.includes(p.format)) {
        return NextResponse.json({ error: `Piece ${i + 1} has an invalid format.` }, { status: 400 });
      }
    }

    // --- Create Contributor ---
    const contributor = createContributor(corpusId, contributorName, senderType);

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
        errorMessage = err.message || "Failed to contact Claude scoring service.";
      }

      if (!errorOccurred) {
        const validation = validateAndComputeScore(rawJson, words);
        if (validation.ok) {
          scoringResult = validation.result;
        } else {
          errorOccurred = true;
          errorMessage = validation.detail || "Claude returned a malformed scoring structure.";
        }
      }

      // Save the piece record regardless (or if we failed, we flag it. Let's save if successful, or we can abort. Let's fail the intake transaction if scoring fails so the user can correct the input or retry.)
      if (errorOccurred) {
        return NextResponse.json({
          error: `Failed to score piece "${p.title}": ${errorMessage}`
        }, { status: 502 });
      }

      const savedPiece = createPiece(
        corpusId,
        contributor.id,
        p.title,
        p.text,
        p.genreTag as GenreTag,
        p.format as "article" | "audiovisual" | "social"
      );

      const savedAnalysis = createAnalysis(
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

      results.push({
        piece: savedPiece,
        analysis: savedAnalysis,
        scoreResult: scoringResult
      });
    }

    return NextResponse.json({
      success: true,
      contributor,
      results
    }, { status: 201 });
  } catch (err: any) {
    console.error("[api/intake] Batch intake error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred during batch intake." }, { status: 500 });
  }
}
