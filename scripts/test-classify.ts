// Verification script for Phase 4 Hello World classifier.
// Classifies a piece that explicitly mentions migration/mobility to prove the classifier detects active paradigms.

import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { runClassification } from "../lib/classifier";

const SAMPLE_MIGRANT_TEXT = `
Como migrante venezolana en Colombia, me di cuenta de que las políticas públicas nos tratan siempre como receptores de asistencia o como una carga económica. Por eso fundé un colectivo de mujeres migrantes en Cúcuta. Nosotras no esperamos ayuda: organizamos talleres de costura y vendemos nuestros productos, aportando a la economía local. El conocimiento que traemos sobre emprendimiento y resiliencia es valiosísimo para la comunidad de acogida, y trabajamos codo a codo con las vecinas colombianas. Nuestra identidad es fluida, somos de aquí y de allá, y esa mezcla cultural nos hace más fuertes a todas.
`.trim();

async function main() {
  console.log("=== Phase 4: Testing Hello World Classifier with Migrant Text ===");
  console.log(`Text to classify:\n"${SAMPLE_MIGRANT_TEXT}"\n`);

  try {
    const start = Date.now();
    const result = await runClassification(SAMPLE_MIGRANT_TEXT);
    const duration = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`Classification complete in ${duration}s.`);
    console.log("\nJSON Output:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n=== Validation check ===");
    for (const [key, value] of Object.entries(result)) {
      const val = value as { level: string; justification: string };
      console.log(`- ${key}:`);
      console.log(`  Level: ${val.level.toUpperCase()}`);
      console.log(`  Justification: ${val.justification}`);
    }
  } catch (err: any) {
    console.error("Classification test failed:", err.message || err);
  }
}

main().catch((err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
