// Extracted from CAS (scoring-matrix-demo) lib/paradigm.ts @ 42cce10, 2026-07-07
/**
 * Paradigm constants and scoring math (docs/SCORING_MODEL.md,
 * docs/SYSTEM_PROMPT.md). Pure functions only — no I/O, no React.
 */
import type {
  DimensionKey,
  DimensionScore,
  GenreTag,
  ParadigmName,
} from "@/lib/types";
import type { SubjectType } from "@/lib/db/types";
import { DEFAULT_GENRE_WEIGHTS, getWeightVector } from "@/lib/scoring/weights";

type DimensionMeta = {
  key: DimensionKey;
  fullName: string;
  shortName: string;
  defaultWeight: number;
  color: string;
  oneLineDescription: string;
};

/** The five dimensions, in order D1→D5. */
export const DIMENSIONS: DimensionMeta[] = [
  {
    key: "D1",
    fullName: "Agency & Contribution",
    shortName: "Agency",
    defaultWeight: 0.25,
    color: "#E87722",
    oneLineDescription:
      "Who acts in this text, who is acted upon, and who gets to contribute? This dimension tests whether agency is concentrated in institutions and adults — or distributed universally, and in the present tense.",
  },
  {
    key: "D2",
    fullName: "Systemic & Architectural Framing",
    shortName: "Systemic Framing",
    defaultWeight: 0.25,
    color: "#0A3558",
    oneLineDescription:
      "Does the text locate problems and solutions at the level of rules, structures, and social architectures — or at the level of individuals and programs?",
  },
  {
    key: "D3",
    fullName: "Empathy Enactment",
    shortName: "Empathy",
    defaultWeight: 0.2,
    color: "#B98A39",
    oneLineDescription:
      "Does the text demonstrate the practice of conscious empathy — the capacity to be aware of and understand our own and others’ perspectives, and to guide one’s actions to contribute to the common good — or does it stop at emotional solidarity?",
  },
  {
    key: "D4",
    fullName: "Collaboration & Leadership",
    shortName: "Collaboration",
    defaultWeight: 0.2,
    color: "#334E68",
    oneLineDescription:
      "Does the text enact distributed, fluid leadership that shares power and knowledge across hierarchies — including across generations?",
  },
  {
    key: "D5",
    fullName: "Identity Embodiment",
    shortName: "Identity",
    defaultWeight: 0.1,
    color: "#627D98",
    oneLineDescription:
      "Does the narrator position themselves as a changemaker through the structure of their language — or do they merely claim the label? This dimension tests the gap between stated identity (\"I am a changemaker\") and enacted identity: language that demonstrates the worldview without requiring the vocabulary, consistently across contexts and over time. It tests reflexivity.",
  },
];

type ParadigmMeta = {
  /** 0–4 */
  level: number;
  name: ParadigmName;
  descriptor: string;
  scoreRange: [number, number];
};

/** Paradigm names by Enactment Score band, level 0→4. */
export const PARADIGM_NAMES: ParadigmMeta[] = [
  {
    level: 0,
    name: "Spectator",
    descriptor: "Change happens elsewhere, authored by others.",
    scoreRange: [0, 19],
  },
  {
    level: 1,
    name: "Sympathizer",
    descriptor:
      "Change is recognized and valued, but still understood as someone else's job.",
    scoreRange: [20, 39],
  },
  {
    level: 2,
    name: "Contributor",
    descriptor:
      "Agency enters the picture. The narrator sees themselves as a contributor, though the framing remains partial.",
    scoreRange: [40, 59],
  },
  {
    level: 3,
    name: "Changemaker",
    descriptor:
      "I am creating change. Change is owned, built, and driven from within.",
    scoreRange: [60, 79],
  },
  {
    level: 4,
    name: "System Architect",
    descriptor:
      "We are rewriting the rules. Agency is distributed, structures are named and challenged.",
    scoreRange: [80, 100],
  },
];

/**
 * Genre-adjusted weights [w1, w2, w3, w4, w5], one tuple per genre tag
 * (docs/SYSTEM_PROMPT.md). Each tuple sums to 1.0. The data now lives in
 * lib/scoring/weights.ts (the per-subject-type config file); this re-export
 * keeps the original import path working for existing consumers.
 */
export const GENRE_WEIGHTS = DEFAULT_GENRE_WEIGHTS;

/**
 * Enactment Score = (D1·w1 + D2·w2 + D3·w3 + D4·w4 + D5·w5) × 25,
 * rounded to the nearest integer in [0, 100].
 *
 * `subjectType` selects the weight profile (Decision #5). Omitted — as in
 * the ephemeral analyzer, where no subject exists yet — it uses the default
 * profile. Both type profiles currently equal the default, so passing a
 * type changes nothing numerically until Giselle's org values land.
 */
export function calculateEnactmentScore(
  dims: Record<DimensionKey, DimensionScore>,
  genre: GenreTag,
  subjectType?: SubjectType,
): number {
  const [w1, w2, w3, w4, w5] = getWeightVector(genre, subjectType);
  const weighted =
    dims.D1.score * w1 +
    dims.D2.score * w2 +
    dims.D3.score * w3 +
    dims.D4.score * w4 +
    dims.D5.score * w5;
  return Math.min(100, Math.max(0, Math.round(weighted * 25)));
}

/** Maps an Enactment Score (0–100) to its paradigm name. */
export function resolveParadigmName(score: number): ParadigmName {
  if (score <= 19) return "Spectator";
  if (score <= 39) return "Sympathizer";
  if (score <= 59) return "Contributor";
  if (score <= 79) return "Changemaker";
  return "System Architect";
}

const ORDERED_KEYS: DimensionKey[] = ["D1", "D2", "D3", "D4", "D5"];

/**
 * Derives the EACH Orientation from the dimensional profile, following the
 * logic in docs/SYSTEM_PROMPT.md. When two pair-orientations tie (the
 * documented overlap case), returns both joined by " / ". When the top of the
 * profile is flat across more than two dimensions, there is no dominant pair,
 * so a fully high profile reads as "Full EACH Alignment" or "Emerging".
 */
export function resolveEACHOrientation(
  dims: Record<DimensionKey, DimensionScore>,
): string {
  const scoreOf = (k: DimensionKey): number => dims[k].score;

  // A pair {a, b} is "the top two dimensions" when both score >= 3 and neither
  // scores below any dimension outside the pair (ties at the top allowed).
  const isTopPair = (a: DimensionKey, b: DimensionKey): boolean => {
    if (scoreOf(a) < 3 || scoreOf(b) < 3) return false;
    const maxRest = Math.max(
      ...ORDERED_KEYS.filter((k) => k !== a && k !== b).map(scoreOf),
    );
    return Math.min(scoreOf(a), scoreOf(b)) >= maxRest;
  };

  const matched: string[] = [];
  if (isTopPair("D1", "D5")) matched.push("Lifelong Contribution");
  if (isTopPair("D2", "D4")) matched.push("Changemaker Networks");
  if (isTopPair("D3", "D1")) matched.push("Empathy-based Societies");

  if (matched.length === 1) return matched[0];
  if (matched.length === 2) return matched.join(" / ");

  // matched.length is 0, or >= 3 (only when the top of the profile is flat
  // across enough dimensions that no single pair dominates).
  const allHigh = ORDERED_KEYS.every((k) => scoreOf(k) >= 3);
  return allHigh ? "Full EACH Alignment" : "Emerging";
}

/**
 * Explains how a genre's weights differ from the default weights [0.25, 0.25, 0.20, 0.20, 0.10].
 */
export function getGenreWeightExplanation(genre: GenreTag, locale: "es" | "en" = "es"): string {
  const defaultWeights = [0.25, 0.25, 0.20, 0.20, 0.10];
  const weights = GENRE_WEIGHTS[genre];
  const diffs: string[] = [];
  const dims: DimensionKey[] = ["D1", "D2", "D3", "D4", "D5"];

  for (let i = 0; i < 5; i++) {
    const w = weights[i];
    const defW = defaultWeights[i];
    if (Math.abs(w - defW) > 0.001) {
      const pct = Math.round(w * 100);
      if (w > defW) {
        diffs.push(locale === "es" ? `${dims[i]} sube a ${pct}%` : `${dims[i]} up to ${pct}%`);
      } else {
        diffs.push(locale === "es" ? `${dims[i]} baja a ${pct}%` : `${dims[i]} down to ${pct}%`);
      }
    }
  }

  if (diffs.length === 0) {
    return locale === "es" ? "Usa los pesos por defecto" : "Uses default weights";
  }

  return locale === "es"
    ? `Ajusta los pesos: ${diffs.join(", ")}`
    : `Adjusts weights: ${diffs.join(", ")}`;
}
