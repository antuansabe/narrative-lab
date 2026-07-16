import { NextResponse } from "next/server";
import { readDb } from "@/lib/db/mockStore";
import { MODEL_VERSION, SCHEMA_VERSION } from "@/lib/version";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: corpusId } = await params;
    const db = await readDb();

    // Find corpus
    const corpus = db.corpora.find((c) => c.id === corpusId);
    if (!corpus) {
      return NextResponse.json({ error: `No se encontró el corpus con ID ${corpusId}.` }, { status: 404 });
    }

    // Filter data belonging to this corpus
    const pieces = db.pieces.filter((p) => p.corpusId === corpusId);
    const contributors = db.contributors.filter((c) => c.corpusId === corpusId);
    
    const pieceIds = pieces.map((p) => p.id);
    const analyses = db.analyses.filter((a) => pieceIds.includes(a.pieceId));
    const classifications = db.paradigmClassifications.filter((pc) => pieceIds.includes(pc.pieceId));

    // Calculate dimensions statistics (mean, stdDev)
    const dimKeys = ["D1", "D2", "D3", "D4", "D5"] as const;
    const dimensionsStats = {} as Record<typeof dimKeys[number], { mean: number; stdDev: number }>;

    const totalAnalyzed = analyses.length;

    for (const d of dimKeys) {
      if (totalAnalyzed === 0) {
        dimensionsStats[d] = { mean: 0, stdDev: 0 };
        continue;
      }

      // Map score key from db object
      const dbScoreKey = d.toLowerCase() as "d1" | "d2" | "d3" | "d4" | "d5";
      const scores = analyses.map((a) => a[dbScoreKey]);
      
      const sum = scores.reduce((acc, val) => acc + val, 0);
      const mean = sum / totalAnalyzed;

      const squareDiffsSum = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
      const variance = squareDiffsSum / totalAnalyzed;
      const stdDev = Math.sqrt(variance);

      dimensionsStats[d] = {
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
      };
    }

    // Calculate paradigm classifications distribution
    const paradigmKeys = ["paradigm1", "paradigm2", "paradigm3", "paradigm4"] as const;
    const paradigmStats = {} as Record<
      typeof paradigmKeys[number],
      {
        absent: number;
        present: number;
        central: number;
        pctAbsent: number;
        pctPresent: number;
        pctCentral: number;
      }
    >;

    for (const pKey of paradigmKeys) {
      const pClassifications = classifications.filter((pc) => pc.paradigm === pKey);
      const totalClassified = pClassifications.length;

      let absent = 0;
      let present = 0;
      let central = 0;

      for (const pc of pClassifications) {
        if (pc.level === "absent") absent++;
        else if (pc.level === "present") present++;
        else if (pc.level === "central") central++;
      }

      paradigmStats[pKey] = {
        absent,
        present,
        central,
        pctAbsent: totalClassified > 0 ? Math.round((absent / totalClassified) * 1000) / 10 : 0,
        pctPresent: totalClassified > 0 ? Math.round((present / totalClassified) * 1000) / 10 : 0,
        pctCentral: totalClassified > 0 ? Math.round((central / totalClassified) * 1000) / 10 : 0,
      };
    }

    // Sender Type Segmentation
    const senderTypes = ["journalist", "organization", "other"] as const;
    const senderTypeStats = {} as Record<
      typeof senderTypes[number],
      Record<typeof dimKeys[number], number> | null
    >;

    for (const st of senderTypes) {
      const matchingContributorIds = contributors.filter((c) => c.senderType === st).map((c) => c.id);
      const matchingPieces = pieces.filter((p) => matchingContributorIds.includes(p.contributorId));
      const matchingPieceIds = matchingPieces.map((p) => p.id);
      const matchingAnalyses = analyses.filter((a) => matchingPieceIds.includes(a.pieceId));

      if (matchingAnalyses.length === 0) {
        senderTypeStats[st] = null;
        continue;
      }

      const stDims = {} as Record<typeof dimKeys[number], number>;
      for (const d of dimKeys) {
        const dbScoreKey = d.toLowerCase() as "d1" | "d2" | "d3" | "d4" | "d5";
        const sum = matchingAnalyses.reduce((acc, val) => acc + val[dbScoreKey], 0);
        stDims[d] = Math.round((sum / matchingAnalyses.length) * 100) / 100;
      }
      senderTypeStats[st] = stDims;
    }

    // Format Segmentation
    const formats = ["article", "audiovisual", "social"] as const;
    const formatStats = {} as Record<
      typeof formats[number],
      Record<typeof dimKeys[number], number> | null
    >;

    for (const f of formats) {
      const matchingPieces = pieces.filter((p) => p.format === f);
      const matchingPieceIds = matchingPieces.map((p) => p.id);
      const matchingAnalyses = analyses.filter((a) => matchingPieceIds.includes(a.pieceId));

      if (matchingAnalyses.length === 0) {
        formatStats[f] = null;
        continue;
      }

      const fDims = {} as Record<typeof dimKeys[number], number>;
      for (const d of dimKeys) {
        const dbScoreKey = d.toLowerCase() as "d1" | "d2" | "d3" | "d4" | "d5";
        const sum = matchingAnalyses.reduce((acc, val) => acc + val[dbScoreKey], 0);
        fDims[d] = Math.round((sum / matchingAnalyses.length) * 100) / 100;
      }
      formatStats[f] = fDims;
    }

    // Intra-Author Coherence Stats
    const coherenceStats = contributors.map((contributor) => {
      const authorPieces = pieces.filter((p) => p.contributorId === contributor.id);
      const authorPieceIds = authorPieces.map((p) => p.id);
      const authorAnalyses = analyses.filter((a) => authorPieceIds.includes(a.pieceId));

      const scores = authorAnalyses.map((a) => a.enactmentScore);
      const K = scores.length;

      if (K <= 1) {
        return {
          contributorId: contributor.id,
          name: contributor.name,
          senderType: contributor.senderType,
          piecesCount: K,
          scores,
          meanScore: K === 1 ? scores[0] : 0,
          stdDev: 0,
          coherenceLevel: "n/a" as const,
        };
      }

      const sum = scores.reduce((acc, val) => acc + val, 0);
      const meanScore = sum / K;

      const squareDiffsSum = scores.reduce((acc, val) => acc + Math.pow(val - meanScore, 2), 0);
      const stdDev = Math.sqrt(squareDiffsSum / K);

      let coherenceLevel: "alta" | "media" | "divergente" = "alta";
      if (stdDev > 25) {
        coherenceLevel = "divergente";
      } else if (stdDev > 10) {
        coherenceLevel = "media";
      }

      return {
        contributorId: contributor.id,
        name: contributor.name,
        senderType: contributor.senderType,
        piecesCount: K,
        scores,
        meanScore: Math.round(meanScore * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        coherenceLevel,
      };
    });

    // Check version mismatches
    const versionMismatchCount = analyses.filter(
      (a) => a.modelVersion !== MODEL_VERSION || a.schemaVersion !== SCHEMA_VERSION
    ).length;

    return NextResponse.json({
      corpus,
      piecesCount: pieces.length,
      analyzedCount: totalAnalyzed,
      contributorsCount: contributors.length,
      stats: {
        dimensions: dimensionsStats,
        paradigms: paradigmStats,
        versionMismatch: {
          count: versionMismatchCount,
          currentModel: MODEL_VERSION,
          currentSchema: SCHEMA_VERSION,
        },
        segmentation: {
          senderType: senderTypeStats,
          format: formatStats,
        },
        coherence: coherenceStats,
      },
      pieces,
      contributors,
      analyses,
      classifications,
    }, { status: 200 });
  } catch (err: any) {
    console.error(`[api/corpora/[id]] GET error:`, err);
    return NextResponse.json({ error: err.message || "No se pudieron obtener los detalles del corpus." }, { status: 500 });
  }
}
