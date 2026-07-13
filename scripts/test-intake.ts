// Script to verify Phase 3 evidence: 6 pieces from 2 contributors scored and stored.
// Execute via: npx tsx --env-file=.env.local scripts/test-intake.ts

import { createCorpus, getCorpora, getContributors, getPieces, readDb, createContributor, createPiece, createAnalysis } from "../lib/db/mockStore";
import { callClaudeWithCachedSystem } from "../lib/anthropic";
import { SCORER_SYSTEM_PROMPT } from "../lib/prompts/scorer";
import { validateAndComputeScore } from "../lib/scoring";
import { countWords } from "../lib/text";
import { MODEL_VERSION, SCHEMA_VERSION } from "../lib/version";
import type { GenreTag } from "../lib/types";

const TEXT_CHARITY = `Cada año atendemos a más de 5,000 niños y niñas en situación de vulnerabilidad en todo el país. Nuestro equipo de voluntarios entrega despensas, organiza posadas navideñas y proporciona apoyo escolar a quienes más lo necesitan. Gracias al esfuerzo de nuestros aliados corporativos, hemos podido extender nuestra labor a tres nuevos estados durante este año.
La pobreza en México sigue siendo un reto enorme, especialmente para los niños que crecen en hogares con carencias múltiples. Por eso nuestro modelo se enfoca en proveer las herramientas básicas que les permitan tener un mejor futuro: alimentación adecuada, materiales escolares y acompañamiento emocional. Confiamos en que con el apoyo de la sociedad civil, podremos seguir transformando vidas.
Este año, gracias a la generosidad de nuestros donantes, logramos impactar a 1,200 familias más que en 2024. Trabajamos con dedicación para asegurar que cada peso donado se traduzca en beneficios tangibles para los pequeños beneficiarios. Nuestro compromiso es seguir creciendo y llegar a más comunidades que nos necesitan.`;

const TEXT_INSTITUTIONAL = `Somos una organización transformadora comprometida con el cambio sistémico y el empoderamiento de las comunidades más vulnerables de América Latina. Lideramos iniciativas innovadoras que están redefiniendo el ecosistema de impacto social en la región, articulando alianzas estratégicas con actores de todos los sectores para construir un futuro más equitativo.
Nuestro enfoque holístico integra perspectivas multidisciplinarias y nos permite operar con agilidad en contextos complejos. Hemos consolidado una metodología propia que conjuga investigación de vanguardia, co-creación con beneficiarios y advocacy de alto nivel. Esto nos ha posicionado como referente regional del nuevo paradigma de cambio.
En los últimos cinco años hemos impulsado más de cuarenta proyectos transformadores en doce países, beneficiando a miles de personas y consolidando nuestro liderazgo en innovación social. Nuestro equipo está formado por líderes visionarios comprometidos con generar impacto a escala. Creemos firmemente en el poder transformador de la juventud y en la urgencia de empoderar a la próxima generación de agentes de cambio.`;

const TEXT_ASSEMBLIES = `Las asambleas vecinales con las que trabajamos en Iztapalapa no son destinatarias de nuestra intervención: son las que están definiendo qué problema se trabaja y a qué velocidad. Cuando en 2023 intentamos imponer un cronograma externo financiado por un fondo internacional, las propias asambleas nos lo regresaron — nos dijeron que esa lógica de entregables no se sostenía con los tiempos de las decisiones colectivas. Tuvimos que reaprender lo que habíamos hecho mal.
Lo que entendí ese año es que mi rol no es producir las soluciones, sino facilitar conversaciones entre organizaciones vecinales que históricamente no hablaban entre sí. Hay jóvenes de quince y dieciséis años que están coordinando hoy las mesas de seguridad de su colonia, no porque las hayamos capacitado, sino porque las asambleas decidieron que esos espacios necesitaban su lectura. Algunas de las propuestas más útiles que he visto este año vinieron de ellos.
Sigo aprendiendo a soltar. Mi formación previa me había enseñado a llegar con un diagnóstico y una propuesta; el trabajo aquí me ha exigido lo contrario — escuchar mucho antes de proponer, y aceptar que mi lectura del problema muchas veces está incompleta. Eso ha sido la curva más difícil.`;

const TEXT_EDUCATION = `Cuando hablamos de transformar la educación, casi siempre hablamos de cambiar lo que ocurre dentro del aula — la pedagogía, los contenidos, la formación docente. Pero las reglas que definen qué cuenta como aprendizaje válido en este país no están en el aula: están en los marcos de evaluación, en los criterios de financiamiento público, en las decisiones de SEP sobre qué se mide y qué no. Hasta que esas reglas no se renombran, lo que pasa dentro del aula sigue empujando contra una arquitectura que premia exactamente lo contrario.
En la red trabajamos con escuelas que están experimentando con métricas de bienestar y de agencia juvenil — métricas que el sistema oficial no reconoce. Una de las maestras con las que trabajamos lo dice mejor que yo: "no es que estemos midiendo cosas distintas; estamos cuestionando que esas otras cosas sean lo medible". Y mientras tanto, hay un grupo de adolescentes que está ayudándonos a diseñar cómo se vería un instrumento de evaluación que tomara en serio su propia lectura de qué les está pasando como aprendices.
Cuando arrancamos no teníamos claro si esto era pedagogía, política pública, o investigación de medición. La respuesta honesta es que es las tres al mismo tiempo, y que esa interdependencia no la podemos resolver eligiendo una. Lo que sí podemos hacer es trabajar simultáneamente en los tres frentes y aceptar que algunas tensiones no se cierran — se sostienen.`;

async function scoreAndSave(
  corpusId: string,
  contributorId: string,
  title: string,
  text: string,
  genreTag: GenreTag,
  format: "article" | "audiovisual" | "social"
) {
  const words = countWords(text);
  console.log(`  Scoring piece "${title}" (${words} words)...`);

  const response = await callClaudeWithCachedSystem({
    model: "claude-sonnet-4-6",
    systemPrompt: SCORER_SYSTEM_PROMPT,
    userMessage: text,
    maxTokens: 3000,
    temperature: 0,
  });

  const validation = validateAndComputeScore(response.text, words);
  if (!validation.ok) {
    throw new Error(`Failed to score/validate "${title}": ${validation.errorCode} - ${validation.detail}`);
  }

  const result = validation.result;
  const savedPiece = createPiece(corpusId, contributorId, title, text, genreTag, format);
  const savedAnalysis = createAnalysis(
    savedPiece.id,
    result.enactmentScore,
    result.dimensions.D1.score,
    result.dimensions.D2.score,
    result.dimensions.D3.score,
    result.dimensions.D4.score,
    result.dimensions.D5.score,
    result.eachOrientation,
    genreTag,
    response.text,
    SCHEMA_VERSION,
    MODEL_VERSION
  );

  console.log(`  ✓ Saved Piece ID ${savedPiece.id} | Score: ${result.enactmentScore} | Paradigm: ${result.paradigmName}`);
  return { savedPiece, savedAnalysis };
}

async function main() {
  console.log("--- Starting Phase 3 Intake Verification Script ---");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not configured.");
    process.exit(1);
  }

  try {
    // 1. Create a Corpus
    const corpusName = "DEMO — Hola América (synthetic test data)";
    const corpus = createCorpus(corpusName);
    console.log(`Created Corpus: "${corpusName}" | ID: ${corpus.id}`);

    // 2. Define Contributors
    console.log("\nRegistering Contributors...");
    const c1 = createContributor(corpus.id, "Juan Periodista", "journalist");
    console.log(`  ✓ Contributor 1: ${c1.name} (${c1.senderType}) | ID: ${c1.id}`);

    const c2 = createContributor(corpus.id, "Horizontes AC", "organization");
    console.log(`  ✓ Contributor 2: ${c2.name} (${c2.senderType}) | ID: ${c2.id}`);

    // 3. Process Pieces for Contributor 1 (3 pieces)
    console.log(`\nProcessing 3 pieces for ${c1.name}...`);
    await scoreAndSave(
      corpus.id,
      c1.id,
      "Asambleas Locales e Impacto en Iztapalapa",
      TEXT_ASSEMBLIES,
      "free-form-interview",
      "article"
    );

    await scoreAndSave(
      corpus.id,
      c1.id,
      "Voces en la Reforma Educativa",
      TEXT_EDUCATION,
      "free-form-interview",
      "article"
    );

    await scoreAndSave(
      corpus.id,
      c1.id,
      "Recaudación y Despensas Infantiles",
      TEXT_CHARITY,
      "fundraising-copy",
      "article"
    );

    // 4. Process Pieces for Contributor 2 (3 pieces)
    console.log(`\nProcessing 3 pieces for ${c2.name}...`);
    await scoreAndSave(
      corpus.id,
      c2.id,
      "Reporte de Empoderamiento Regional",
      TEXT_INSTITUTIONAL,
      "institutional-report",
      "article"
    );

    await scoreAndSave(
      corpus.id,
      c2.id,
      "Diálogo y Autonomía Vecinal",
      TEXT_ASSEMBLIES,
      "free-form-interview",
      "article"
    );

    await scoreAndSave(
      corpus.id,
      c2.id,
      "Pedagogía Cuestionada y Nuevas Métricas",
      TEXT_EDUCATION,
      "institutional-report",
      "article"
    );

    // 5. Verification Audit
    console.log("\n--- Verification Audit ---");
    const db = readDb();
    console.log(`Total Corpora in Database: ${db.corpora.length}`);
    console.log(`Total Contributors: ${db.contributors.length}`);
    console.log(`Total Pieces: ${db.pieces.length}`);
    console.log(`Total Analyses: ${db.analyses.length}`);

    if (db.pieces.length >= 6 && db.analyses.length >= 6) {
      console.log("\n✅ PHASE 3 VERIFICATION PASSED!");
      console.log("6 pieces from 2 contributors were successfully scored and stored in the database.");
    } else {
      console.error("\n❌ Verification Failed: Database counts do not match expected values.");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ Error running intake test:", err);
    process.exit(1);
  }
}

main();
