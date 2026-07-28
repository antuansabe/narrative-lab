// Recompute stored enactment scores after a weight-vector change.
// NO API calls — raw d1–d5 scores are untouched; only the weighted
// composite is recomputed with the current GENRE_WEIGHTS table.
//
// Context: Giselle validated new journalistic-article weights
// [0.25, 0.25, 0.25, 0.20, 0.05] on 2026-07-27 (Teams). Existing
// analyses stored the composite under the old provisional vector.
//
// Usage:
//   npx tsx scripts/recompute-scores.ts            → dry-run (prints diff)
//   npx tsx scripts/recompute-scores.ts --apply    → writes to Supabase
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { getSupabase } from "../lib/db/client";
import { GENRE_WEIGHTS } from "../lib/paradigm";
import type { GenreTag } from "../lib/types";

const APPLY = process.argv.includes("--apply");

async function main() {
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from("analyses")
    .select("id, piece_id, enactment_score, d1, d2, d3, d4, d5, genre_tag");
  if (error) throw error;
  if (!rows || rows.length === 0) {
    console.log("No analyses found.");
    return;
  }

  console.log(`Mode: ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"}`);
  console.log(`Found ${rows.length} analyses.\n`);

  let changed = 0;
  for (const r of rows) {
    const w = GENRE_WEIGHTS[r.genre_tag as GenreTag];
    if (!w) {
      console.warn(`  ! Unknown genre "${r.genre_tag}" on analysis ${r.id} — skipped`);
      continue;
    }
    const newScore = Math.round(
      (r.d1 * w[0] + r.d2 * w[1] + r.d3 * w[2] + r.d4 * w[3] + r.d5 * w[4]) * 25,
    );
    if (newScore === r.enactment_score) continue;

    changed++;
    console.log(
      `  ${r.genre_tag}  ${r.enactment_score} → ${newScore}  (d1-d5: ${r.d1},${r.d2},${r.d3},${r.d4},${r.d5})  analysis ${r.id}`,
    );

    if (APPLY) {
      const { error: upErr } = await supabase
        .from("analyses")
        .update({ enactment_score: newScore })
        .eq("id", r.id);
      if (upErr) {
        console.error(`  ✗ Failed to update ${r.id}:`, upErr.message);
      }
    }
  }

  console.log(
    `\n${changed} of ${rows.length} scores ${APPLY ? "updated" : "would change"}.`,
  );
  if (!APPLY && changed > 0) {
    console.log("Re-run with --apply to write.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
