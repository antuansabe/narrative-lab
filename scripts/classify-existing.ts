// Script to run Hello World paradigm classification over all existing pieces in mock DB.
// Serves as Phase 4 runnable evidence.

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { readDb, getParadigmClassifications, createParadigmClassification } from "../lib/db/mockStore";
import { runClassification } from "../lib/classifier";
import { MODEL_VERSION } from "../lib/version";

async function main() {
  console.log("=== Phase 4: Running Hello World Paradigm Classifier ===");
  
  const db = readDb();
  const pieces = db.pieces;
  console.log(`Found ${pieces.length} pieces in database.`);

  let runCount = 0;
  for (const piece of pieces) {
    const existing = getParadigmClassifications(piece.id);
    if (existing.length > 0) {
      console.log(`Piece "${piece.title}" already classified (${existing.length} records). Skipping.`);
      continue;
    }

    console.log(`\nClassifying piece: "${piece.title}"...`);
    console.log(`Content snippet: "${piece.text.slice(0, 150)}..."`);
    
    try {
      const start = Date.now();
      const classifications = await runClassification(piece.text);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`Classification complete in ${duration}s.`);
      console.log("Results:");
      for (const [key, value] of Object.entries(classifications)) {
        const val = value as { level: string; justification: string };
        console.log(`  - ${key}: [${val.level.toUpperCase()}]`);
        console.log(`    Justification: ${val.justification}`);
      }

      // Persist classifications
      createParadigmClassification(piece.id, "paradigm1", classifications.paradigm1.level, classifications.paradigm1.justification, MODEL_VERSION);
      createParadigmClassification(piece.id, "paradigm2", classifications.paradigm2.level, classifications.paradigm2.justification, MODEL_VERSION);
      createParadigmClassification(piece.id, "paradigm3", classifications.paradigm3.level, classifications.paradigm3.justification, MODEL_VERSION);
      createParadigmClassification(piece.id, "paradigm4", classifications.paradigm4.level, classifications.paradigm4.justification, MODEL_VERSION);

      runCount++;
    } catch (err: any) {
      console.error(`Error classifying piece "${piece.title}":`, err.message || err);
    }
  }

  console.log(`\n=== Classification finished. Processed ${runCount} new pieces. ===`);
}

main().catch((err) => {
  console.error("Unhandle rejection in script:", err);
  process.exit(1);
});
