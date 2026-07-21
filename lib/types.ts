// Extracted from CAS (scoring-matrix-demo) lib/types.ts @ 42cce10, 2026-07-07
/**
 * Core types for the Changemaker Worldview Scoring Matrix demo.
 * Shapes mirror docs/SCORING_MODEL.md and docs/SYSTEM_PROMPT.md exactly.
 */

/** The five scoring dimensions. */
export type DimensionKey = "D1" | "D2" | "D3" | "D4" | "D5";

/** The six recognized genre tags (docs/SYSTEM_PROMPT.md). */
export type GenreTag =
  | "free-form-interview"
  | "structured-profile"
  | "social-media-post"
  | "institutional-report"
  | "speech-public-address"
  | "fundraising-copy"
  | "journalistic-article";

/** Paradigm name by Enactment Score band (docs/SCORING_MODEL.md). */
export type ParadigmName =
  | "Spectator"
  | "Sympathizer"
  | "Contributor"
  | "Changemaker"
  | "System Architect";

/**
 * EACH Orientation: one of the five canonical values, or — in the documented
 * overlap case — a free-form "X / Y" string combining two of them.
 */
export type EACHOrientation =
  | "Lifelong Contribution"
  | "Changemaker Networks"
  | "Empathy-based Societies"
  | "Full EACH Alignment"
  | "Emerging"
  // `string & {}` keeps the literal members visible in editor autocomplete
  // while still admitting the documented dual "X / Y" orientation string.
  | (string & {});

/** A single dimension's score, with its justification and supporting quotes. */
export type DimensionScore = {
  score: number;
  justification: string;
  quotes: string[];
};

/** The structured output returned by the live scorer (docs/SYSTEM_PROMPT.md). */
export type ScoreResult = {
  genreTag: GenreTag;
  wordCount: number;
  dimensions: Record<DimensionKey, DimensionScore>;
  enactmentScore: number;
  paradigmName: ParadigmName;
  eachOrientation: EACHOrientation;
  wordCountWarnings: string[];
  confidenceFlags: string[];
  detectedGenreTag?: GenreTag;
  effectiveGenreTag?: GenreTag;
  genreOverridden?: boolean;
};

/** A pre-scored anchor sample (docs/SAMPLES.md). */
export type Sample = {
  id: string;
  title: string;
  subtitle: string;
  /** 0–4 */
  paradigmLevel: number;
  paradigmName: ParadigmName;
  genreTag: GenreTag;
  /** Hex color string */
  accentColor: string;
  excerpt: string;
  expectedEnactmentScore: number;
  expectedEACHOrientation: string;
  expertScores: Record<DimensionKey, DimensionScore>;
};

// ---------------------------------------------------------------------------
// Extraction & Analysis types (Phase 2 — batch pipeline / /api/analyze)
// ---------------------------------------------------------------------------

/** Hello World shifts — 4 arrays of verbatim quotes from the text. */
export type HelloWorldShifts = {
  shift1_contribution: string[];
  shift2_sharedExperience: string[];
  shift3_valueOfContributions: string[];
  shift4_fluidCommunities: string[];
};

/** Structured extraction output (extractor prompt, schemaVersion 1). */
export type ExtractionResult = {
  schemaVersion: number;
  actors: string[];
  problemQuotes: string[];
  solutionQuotes: string[];
  geography: string[];
  helloWorldShifts: HelloWorldShifts;
};

/** Token usage for cost tracking (both calls combined). */
export type AnalysisUsage = {
  totalInputTokens: number;
  totalOutputTokens: number;
  scoringInputTokens: number;
  scoringOutputTokens: number;
  extractionInputTokens: number;
  extractionOutputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

/** Combined scoring + extraction result (returned by /api/analyze). */
export type AnalysisResult = {
  score: ScoreResult;
  extraction: ExtractionResult;
  meta: {
    slug?: string;
    wordCount: number;
    analyzedAt: string;
    usage: AnalysisUsage;
    /** True when extraction failed and was degraded to empty arrays. */
    extractionDegraded?: boolean;
  };
};

/** Results returned by the narrative report synthesis engine. */
export type SynthesisResult = {
  executiveSummary: string;
  communityProfile: {
    narrativeSummary: string;
    dominantParadigm: string;
    averageScore: number;
    keyStrengths: string[];
    keyGaps: string[];
  };
  dimensionInsights: {
    dimension: DimensionKey;
    dimensionName: string;
    communityAverage: number;
    insight: string;
    representativeQuote: string;
  }[];
  helloWorldShifts: {
    shiftId: keyof HelloWorldShifts;
    shiftLabel: string;
    frequency: "High" | "Medium" | "Low" | "Absent";
    insight: string;
    exampleQuote: string | null;
  }[];
  narrativePatterns: {
    pattern: string;
    description: string;
    frequency: string;
    exampleQuote: string;
  }[];
  geographicCoverage: {
    summary: string;
    mainLocations: string[];
    gaps: string;
  };
  standoutVoices: {
    articleName: string;
    score: number;
    paradigm: string;
    whatMakesItDifferent: string;
  }[];
  opportunities: string[];
};

// ---------------------------------------------------------------------------
// Feedback Card types (/api/feedback)
// ---------------------------------------------------------------------------

/** One "what works well" item — structural observation + verbatim anchor. */
export type FeedbackObservation = {
  observation: string;
  textAnchor: string;
};

/** One "how to strengthen" item — gap / why it matters / concrete reframe. */
export type FeedbackStrength = {
  gap: string;
  whyItMatters: string;
  reframe: string;
};

/** Structured output of the Feedback Analyst (schemaVersion "1.0"). */
export type FeedbackResult = {
  schemaVersion: "1.0";
  summary: {
    keyMessages: string;
    whoActs: string;
    theProblem: string;
    theSolution: string;
  };
  feedback: {
    whatWorksWell: FeedbackObservation[];
    howToStrengthen: FeedbackStrength[];
  };
  question: string;
  /** Populated only in batch mode when crossGenreContext is provided. */
  crossGenre: string | null;
};
