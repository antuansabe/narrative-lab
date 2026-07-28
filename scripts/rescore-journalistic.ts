// Re-score journalistic-article pieces with the updated D5 genre-adjusted
// rubric (editorial stance instead of first-person presence — direction
// approved by Giselle 2026-07-27; wording to be validated on a sample
// BEFORE the full corpus run).
//
// Usage:
//   npx tsx scripts/rescore-journalistic.ts                 → dry-run, 3 pieces
//   npx tsx scripts/rescore-journalistic.ts --limit 5       → dry-run, 5 pieces
//   npx tsx scripts/rescore-journalistic.ts --all --apply   → full corpus, writes
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { getSupabase } from "../lib/db/client";
import { callClaudeWithCachedSystem } from "../lib/anthropic";
import { SCORER_SYSTEM_PROMPT } from "../lib/prompts/scorer";
import { validateAndComputeScore } from "../lib/scoring";
import { countWords } from "../lib/text";
import { MODEL_VERSION, SCHEMA_VERSION } from "../lib/version";

const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = ALL ? Infinity : limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : 3;

async function main() {
  const supabase = getSupabase();
  const { data: pieces, error } = await supabase
    .from("pieces")
    .select("id, title, text, genre_tag")
    .eq("genre_tag", "journalistic-article")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!pieces || pieces.length === 0) {
    console.log("No journalistic-article pieces found.");
    return;
  }

  const batch = pieces.slice(0, LIMIT === Infinity ? pieces.length : LIMIT);
  console.log(`Mode: ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"}`);
  console.log(`Re-scoring ${batch.length} of ${pieces.length} journalistic pieces.\n`);

  for (const piece of batch) {
    const { data: oldA } = await supabase
      .from("analyses")
      .select("id, enactment_score, d1, d2, d3, d4, d5")
      .eq("piece_id", piece.id)
      .maybeSingle();

    console.log(`— "${piece.title}"`);
    process.stdout.write("  scoring… ");
    const t0 = Date.now();
    const response = await callClaudeWithCachedSystem({
      model: "claude-sonnet-4-6",
      systemPrompt: SCORER_SYSTEM_PROMPT,
      userMessage: piece.text,
      maxTokens: 8000,
      temperature: 0,
    });
    if (response.stopReason === "max_tokens") {
      console.log("✗ truncated (max_tokens) — skipped");
      continue;
    }
    const v = validateAndComputeScore(response.text, countWords(piece.text));
    if (!v.ok) {
      console.log(`✗ invalid scorer output (${v.errorCode}) — skipped`);
      continue;
    }
    const r = v.result;
    console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    const oldD5 = oldA ? oldA.d5 : "?";
    const oldScore = oldA ? oldA.enactment_score : "?";
    console.log(
      `  D5: ${oldD5} → ${r.dimensions.D5.score}   Score: ${oldScore} → ${r.enactmentScore}`,
    );
    console.log(`  D5 justification: ${r.dimensions.D5.justification}`);
    for (const q of r.dimensions.D5.quotes.slice(0, 2)) {
      console.log(`    » "${q}"`);
    }

    if (APPLY && oldA) {
      const { error: upErr } = await supabase
        .from("analyses")
        .update({
          enactment_score: r.enactmentScore,
          d1: r.dimensions.D1.score,
          d2: r.dimensions.D2.score,
          d3: r.dimensions.D3.score,
          d4: r.dimensions.D4.score,
          d5: r.dimensions.D5.score,
          each_orientation: r.eachOrientation,
          raw_json: JSON.stringify(r),
          model_version: MODEL_VERSION,
          schema_version: SCHEMA_VERSION,
        })
        .eq("id", oldA.id);
      if (upErr) console.error(`  ✗ Failed to update:`, upErr.message);
      else console.log("  ✓ updated");
    }
    console.log("");
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
