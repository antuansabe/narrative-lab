// Extracted from CAS (scoring-matrix-demo) lib/scoring.ts @ 42cce10, 2026-07-07
/**
 * Shared score validation and server-side recomputation.
 *
 * Extracted from app/api/score/route.ts so that both /api/score and
 * /api/analyze use the same logic. Pure functions — no I/O, no HTTP.
 */
import {
  calculateEnactmentScore,
  resolveEACHOrientation,
  resolveParadigmName,
} from "@/lib/paradigm";
import type {
  DimensionKey,
  DimensionScore,
  GenreTag,
  ScoreResult,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIMENSION_KEYS: DimensionKey[] = ["D1", "D2", "D3", "D4", "D5"];
const VALID_GENRE_TAGS: GenreTag[] = [
  "free-form-interview",
  "structured-profile",
  "social-media-post",
  "institutional-report",
  "speech-public-address",
  "fundraising-copy",
  "journalistic-article",
];

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isDimensionScore(value: unknown): value is DimensionScore {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.score === "number" &&
    o.score >= 0 &&
    o.score <= 4 &&
    typeof o.justification === "string" &&
    Array.isArray(o.quotes) &&
    o.quotes.every((q) => typeof q === "string")
  );
}

interface ValidatedScorerOutput {
  genreTag: GenreTag;
  dimensions: Record<DimensionKey, DimensionScore>;
  enactmentScore: number;
  paradigmName: string;
  eachOrientation: string;
  wordCountWarnings: unknown;
  confidenceFlags: unknown;
}

/** Minimal shape validation of the JSON the scorer returns. */
function validateShape(parsed: unknown): parsed is ValidatedScorerOutput {
  if (typeof parsed !== "object" || parsed === null) return false;
  const o = parsed as Record<string, unknown>;

  if (
    typeof o.genreTag !== "string" ||
    !VALID_GENRE_TAGS.includes(o.genreTag as GenreTag)
  ) {
    return false;
  }
  if (typeof o.dimensions !== "object" || o.dimensions === null) return false;
  const dims = o.dimensions as Record<string, unknown>;
  for (const key of DIMENSION_KEYS) {
    if (!isDimensionScore(dims[key])) return false;
  }
  if (typeof o.enactmentScore !== "number") return false;
  if (typeof o.paradigmName !== "string") return false;
  if (typeof o.eachOrientation !== "string") return false;
  return true;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ScoreValidationSuccess = { ok: true; result: ScoreResult };
export type ScoreValidationFailure = {
  ok: false;
  /**
   * Machine-readable failure code — the calling route handler maps it to a
   * localized message (apiErrors catalog). This module stays pure: no
   * translator injection, no user-facing strings.
   * - "scorerUnexpected": unparseable or malformed scorer output.
   * - "scorerRejected": the scorer's own documented too-short/gibberish
   *   escape hatch; `detail` carries its verbatim message (untranslatable —
   *   it comes from the frozen scorer prompt).
   */
  errorCode: "scorerUnexpected" | "scorerRejected";
  detail?: string;
  status: number;
};
export type ScoreValidationResult =
  | ScoreValidationSuccess
  | ScoreValidationFailure;

/**
 * Parse the raw JSON string from the scorer, validate its shape, normalise
 * dimension scores, and recompute derived fields server-side. Returns either
 * a validated `ScoreResult` or an error with a suggested HTTP status code.
 *
 * @param rawJson — The raw text returned by the scorer Claude call
 *                  (code fences already stripped by callClaudeWithCachedSystem).
 * @param wordCount — The server-side word count of the original text
 *                    (overrides whatever the LLM reports).
 */
export function validateAndComputeScore(
  rawJson: string,
  wordCount: number,
): ScoreValidationResult {
  // --- parse ---
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error(
      "[scoring] Could not parse the scorer's JSON:",
      rawJson.slice(0, 500),
    );
    return { ok: false, errorCode: "scorerUnexpected", status: 502 };
  }

  // --- scorer's documented "too short / gibberish" escape hatch ---
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "error" in parsed &&
    typeof (parsed as Record<string, unknown>).error === "string"
  ) {
    return {
      ok: false,
      errorCode: "scorerRejected",
      detail: (parsed as { error: string }).error,
      status: 422,
    };
  }

  // --- shape validation ---
  if (!validateShape(parsed)) {
    console.error(
      "[scoring] Invalid shape from the scorer:",
      JSON.stringify(parsed).slice(0, 500),
    );
    return { ok: false, errorCode: "scorerUnexpected", status: 502 };
  }

  // --- normalise dimension scores (ints in [0,4]) ---
  const dimensions = parsed.dimensions;
  for (const key of DIMENSION_KEYS) {
    const d = dimensions[key];
    d.score = Math.min(4, Math.max(0, Math.round(d.score)));
  }

  // --- recompute derived fields server-side ---
  const serverScore = calculateEnactmentScore(dimensions, parsed.genreTag);
  if (Math.abs(serverScore - parsed.enactmentScore) > 3) {
    console.warn(
      `[scoring] LLM enactmentScore (${parsed.enactmentScore}) differs from server (${serverScore}) by more than 3 points. Using the server value.`,
    );
  }

  const result: ScoreResult = {
    genreTag: parsed.genreTag,
    wordCount,
    dimensions,
    enactmentScore: serverScore,
    paradigmName: resolveParadigmName(serverScore),
    eachOrientation: resolveEACHOrientation(dimensions),
    wordCountWarnings: toStringArray(parsed.wordCountWarnings),
    confidenceFlags: toStringArray(parsed.confidenceFlags),
  };

  return { ok: true, result };
}
