// Extracted from CAS (scoring-matrix-demo) lib/scoring/weights.ts @ 42cce10, 2026-07-07
/**
 * Per-subject-type weight profiles (Decision #5). This is the single config
 * file where Giselle's org weight values land once decided — the selection
 * MECHANISM is wired (Phase 6); the VALUES are deliberately identical to the
 * original calibration until then.
 *
 * A "profile" is a full genre-adjusted table, not a single vector: the
 * instrument's weights have always varied by genre (docs/SYSTEM_PROMPT.md),
 * so a subject-type profile is one such table per type.
 */
import type { GenreTag } from "@/lib/types";
import type { SubjectType } from "@/lib/db/types";

export type WeightVector = [number, number, number, number, number];

/**
 * Genre-adjusted weights [w1..w5], one tuple per genre tag, each summing to
 * 1.0. Moved verbatim from lib/paradigm.ts in Phase 6 — paradigm.ts
 * re-exports this as GENRE_WEIGHTS, so existing importers are unchanged.
 */
export const DEFAULT_GENRE_WEIGHTS: Record<GenreTag, WeightVector> = {
  "free-form-interview": [0.25, 0.2, 0.2, 0.2, 0.15],
  "structured-profile": [0.25, 0.25, 0.2, 0.2, 0.1],
  "social-media-post": [0.3, 0.2, 0.3, 0.1, 0.1],
  "institutional-report": [0.2, 0.3, 0.2, 0.2, 0.1],
  "speech-public-address": [0.25, 0.25, 0.2, 0.2, 0.1],
  "fundraising-copy": [0.2, 0.3, 0.25, 0.15, 0.1],
  // VALIDATED by Giselle Kuri 2026-07-27 (Teams chat, ahead of the
  // 2026-07-29 Hola América presentation). Her criterion: D1/D2/D3 highest,
  // D4 medium, D5 minimal — journalists write in third person by professional
  // norm, so Identity Embodiment must not tank their ranking. She explicitly
  // confirmed the vector "25 / 25 / 25 / 20 / 5" verbatim.
  // Previous provisional value (cloned from institutional-report on
  // 2026-07-16): [0.2, 0.3, 0.2, 0.2, 0.1].
  "journalistic-article": [0.25, 0.25, 0.25, 0.2, 0.05],
};

export const WEIGHT_PROFILES: Record<SubjectType, Record<GenreTag, WeightVector>> = {
  // Individuals (NGLs) — the instrument's original calibration.
  ngl: DEFAULT_GENRE_WEIGHTS,
  // Organizations (JJ Partners).
  // TODO: values pending Giselle — whether D5 Identity Embodiment is
  // down-weighted for orgs is an open decision (plan §1b). Identical to the
  // individual profile until she decides; do not invent values here.
  jj_partner: DEFAULT_GENRE_WEIGHTS,
};

/**
 * Resolve the weight vector for a genre, optionally scoped to a subject
 * type. Without a type (the ephemeral analyzer, where no subject exists
 * yet) this is the original default table.
 */
export function getWeightVector(genre: GenreTag, subjectType?: SubjectType): WeightVector {
  const profile = subjectType ? WEIGHT_PROFILES[subjectType] : DEFAULT_GENRE_WEIGHTS;
  return profile[genre];
}
