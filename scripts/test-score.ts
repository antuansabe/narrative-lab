// Scratch test script to run end-to-end scoring on a sample Spanish text.
// Execute via: npx tsx scripts/test-score.ts

import { callClaudeWithCachedSystem } from "../lib/anthropic";
import { SCORER_SYSTEM_PROMPT } from "../lib/prompts/scorer";
import { validateAndComputeScore } from "../lib/scoring";
import { countWords } from "../lib/text";

const SAMPLE_SPANISH_TEXT = `Las asambleas vecinales con las que trabajamos en Iztapalapa no son destinatarias de nuestra intervención: son las que están definiendo qué problema se trabaja y a qué velocidad. Cuando en 2023 intentamos imponer un cronograma externo financiado por un fondo internacional, las propias asambleas nos lo regresaron — nos dijeron que esa lógica de entregables no se sostenía con los tiempos de las decisiones colectivas. Tuvimos que reaprender lo que habíamos hecho mal.
Lo que entendí ese año es que mi rol no es producir las soluciones, sino facilitar conversaciones entre organizaciones vecinales que históricamente no hablaban entre sí. Hay jóvenes de quince y dieciséis años que están coordinando hoy las mesas de seguridad de su colonia, no porque las hayamos capacitado, sino porque las asambleas decidieron que esos espacios necesitaban su lectura. Algunas de las propuestas más útiles que he visto este año vinieron de ellos.
Sigo aprendiendo a soltar. Mi formación previa me había enseñado a llegar con un diagnóstico y una propuesta; el trabajo aquí me ha exigido lo contrario — escuchar mucho antes de proponer, y aceptar que mi lectura del problema muchas veces está incompleta. Eso ha sido la curva más difícil.`;

async function main() {
  console.log("Starting End-to-End Scoring Test on Spanish text...");
  console.log(`Word count: ${countWords(SAMPLE_SPANISH_TEXT)}`);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set in environment.");
    process.exit(1);
  }

  try {
    console.log("Calling Claude Sonnet to score the text...");
    const result = await callClaudeWithCachedSystem({
      model: "claude-sonnet-4-6", // Use the CAS model identifier
      systemPrompt: SCORER_SYSTEM_PROMPT,
      userMessage: SAMPLE_SPANISH_TEXT,
      maxTokens: 3000,
      temperature: 0,
    });

    console.log("\n--- Raw JSON Response from Model ---");
    console.log(result.text);

    console.log("\nValidating and recomputing score on server...");
    const validation = validateAndComputeScore(result.text, countWords(SAMPLE_SPANISH_TEXT));
    if (validation.ok) {
      console.log("\n✅ E2E SCORING TEST PASSED!");
      console.log("Result object structure:");
      console.log(JSON.stringify(validation.result, null, 2));
    } else {
      console.error("\n❌ Validation Failed:", validation.errorCode, validation.detail);
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ Error running E2E test:", err);
    process.exit(1);
  }
}

main();
