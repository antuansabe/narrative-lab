// Real Supabase-backed persistence (migrated from Phase 3's local JSON mock
// after the Vercel production EROFS failure — read-only filesystem cannot
// write data/db.json in serverless). Filename kept as mockStore.ts to avoid
// touching import paths across the app; it is NO LONGER a mock.
import { getSupabase } from "./client";
import type { GenreTag } from "../types";

export interface Corpus {
  id: string;
  name: string;
  createdAt: string;
}

export interface Contributor {
  id: string;
  corpusId: string;
  name: string;
  senderType: "journalist" | "organization" | "other";
  createdAt: string;
}

export interface Piece {
  id: string;
  corpusId: string;
  contributorId: string;
  title: string;
  text: string;
  genreTag: GenreTag;
  format: "article" | "audiovisual" | "social";
  createdAt: string;
}

export interface Analysis {
  id: string;
  pieceId: string;
  enactmentScore: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  eachOrientation: string;
  genreTag: GenreTag;
  rawJson: string;
  schemaVersion: string;
  modelVersion: string;
  createdAt: string;
}

export interface ParadigmClassification {
  id: string;
  pieceId: string;
  paradigm: "paradigm1" | "paradigm2" | "paradigm3" | "paradigm4";
  level: "absent" | "present" | "central";
  justification: string;
  modelVersion: string;
  createdAt: string;
}

export interface DbSchema {
  corpora: Corpus[];
  contributors: Contributor[];
  pieces: Piece[];
  analyses: Analysis[];
  paradigmClassifications: ParadigmClassification[];
}

// --- row mappers: snake_case (DB) -> camelCase (app), same shape as before ---
function mapCorpus(r: any): Corpus {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}
function mapContributor(r: any): Contributor {
  return { id: r.id, corpusId: r.corpus_id, name: r.name, senderType: r.sender_type, createdAt: r.created_at };
}
function mapPiece(r: any): Piece {
  return {
    id: r.id, corpusId: r.corpus_id, contributorId: r.contributor_id,
    title: r.title, text: r.text, genreTag: r.genre_tag, format: r.format,
    createdAt: r.created_at,
  };
}
function mapAnalysis(r: any): Analysis {
  return {
    id: r.id, pieceId: r.piece_id, enactmentScore: r.enactment_score,
    d1: r.d1, d2: r.d2, d3: r.d3, d4: r.d4, d5: r.d5,
    eachOrientation: r.each_orientation, genreTag: r.genre_tag, rawJson: r.raw_json,
    schemaVersion: r.schema_version, modelVersion: r.model_version, createdAt: r.created_at,
  };
}
function mapPC(r: any): ParadigmClassification {
  return {
    id: r.id, pieceId: r.piece_id, paradigm: r.paradigm, level: r.level,
    justification: r.justification, modelVersion: r.model_version, createdAt: r.created_at,
  };
}

// Full-DB read — used by the ecosystem stats route so its existing
// mean/stdDev/segmentation/coherence computation logic stays untouched.
export async function readDb(): Promise<DbSchema> {
  const sb = getSupabase();
  const [c, co, p, a, pc] = await Promise.all([
    sb.from("corpora").select("*"),
    sb.from("contributors").select("*"),
    sb.from("pieces").select("*"),
    sb.from("analyses").select("*"),
    sb.from("paradigm_classifications").select("*"),
  ]);
  for (const r of [c, co, p, a, pc]) {
    if (r.error) throw new Error(`[db] readDb query failed: ${r.error.message}`);
  }
  return {
    corpora: (c.data ?? []).map(mapCorpus),
    contributors: (co.data ?? []).map(mapContributor),
    pieces: (p.data ?? []).map(mapPiece),
    analyses: (a.data ?? []).map(mapAnalysis),
    paradigmClassifications: (pc.data ?? []).map(mapPC),
  };
}

// --- Corpus API ---
export async function getCorpora(): Promise<Corpus[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("corpora").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`[db] getCorpora failed: ${error.message}`);
  return (data ?? []).map(mapCorpus);
}

export async function createCorpus(name: string): Promise<Corpus> {
  const sb = getSupabase();
  const { data, error } = await sb.from("corpora").insert({ name: name.trim() } as any).select().single();
  if (error) throw new Error(`[db] createCorpus failed: ${error.message}`);
  return mapCorpus(data);
}

// --- Contributor API ---
export async function getContributors(corpusId?: string): Promise<Contributor[]> {
  const sb = getSupabase();
  let q = sb.from("contributors").select("*");
  if (corpusId) q = q.eq("corpus_id", corpusId);
  const { data, error } = await q;
  if (error) throw new Error(`[db] getContributors failed: ${error.message}`);
  return (data ?? []).map(mapContributor);
}

export async function createContributor(
  corpusId: string,
  name: string,
  senderType: "journalist" | "organization" | "other"
): Promise<Contributor> {
  const sb = getSupabase();
  const { data: corpus, error: cErr } = await sb.from("corpora").select("id").eq("id", corpusId).maybeSingle();
  if (cErr) throw new Error(`[db] createContributor lookup failed: ${cErr.message}`);
  if (!corpus) throw new Error(`Corpus with ID ${corpusId} not found.`);
  const { data, error } = await sb
    .from("contributors")
    .insert({ corpus_id: corpusId, name: name.trim(), sender_type: senderType } as any)
    .select()
    .single();
  if (error) throw new Error(`[db] createContributor insert failed: ${error.message}`);
  return mapContributor(data);
}

// --- Piece API ---
export async function getPieces(contributorId?: string): Promise<Piece[]> {
  const sb = getSupabase();
  let q = sb.from("pieces").select("*");
  if (contributorId) q = q.eq("contributor_id", contributorId);
  const { data, error } = await q;
  if (error) throw new Error(`[db] getPieces failed: ${error.message}`);
  return (data ?? []).map(mapPiece);
}

export async function createPiece(
  corpusId: string,
  contributorId: string,
  title: string,
  text: string,
  genreTag: GenreTag,
  format: "article" | "audiovisual" | "social"
): Promise<Piece> {
  const sb = getSupabase();
  const { data: contributor, error: coErr } = await sb
    .from("contributors")
    .select("id")
    .eq("id", contributorId)
    .maybeSingle();
  if (coErr) throw new Error(`[db] createPiece lookup failed: ${coErr.message}`);
  if (!contributor) throw new Error(`Contributor with ID ${contributorId} not found.`);
  const { data, error } = await sb
    .from("pieces")
    .insert({
      corpus_id: corpusId,
      contributor_id: contributorId,
      title: title.trim(),
      text: text.trim(),
      genre_tag: genreTag,
      format,
    } as any)
    .select()
    .single();
  if (error) throw new Error(`[db] createPiece insert failed: ${error.message}`);
  return mapPiece(data);
}

// --- Analysis API ---
export async function getAnalysisForPiece(pieceId: string): Promise<Analysis | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("analyses").select("*").eq("piece_id", pieceId).maybeSingle();
  if (error) throw new Error(`[db] getAnalysisForPiece failed: ${error.message}`);
  return data ? mapAnalysis(data) : null;
}

export async function createAnalysis(
  pieceId: string,
  enactmentScore: number,
  d1: number,
  d2: number,
  d3: number,
  d4: number,
  d5: number,
  eachOrientation: string,
  genreTag: GenreTag,
  rawJson: string,
  schemaVersion: string,
  modelVersion: string
): Promise<Analysis> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("analyses")
    .insert({
      piece_id: pieceId,
      enactment_score: enactmentScore,
      d1, d2, d3, d4, d5,
      each_orientation: eachOrientation,
      genre_tag: genreTag,
      raw_json: rawJson,
      schema_version: schemaVersion,
      model_version: modelVersion,
    } as any)
    .select()
    .single();
  if (error) throw new Error(`[db] createAnalysis insert failed: ${error.message}`);
  return mapAnalysis(data);
}

// --- Paradigm Classification API ---
export async function getParadigmClassifications(pieceId?: string): Promise<ParadigmClassification[]> {
  const sb = getSupabase();
  let q = sb.from("paradigm_classifications").select("*");
  if (pieceId) q = q.eq("piece_id", pieceId);
  const { data, error } = await q;
  if (error) throw new Error(`[db] getParadigmClassifications failed: ${error.message}`);
  return (data ?? []).map(mapPC);
}

export async function createParadigmClassification(
  pieceId: string,
  paradigm: "paradigm1" | "paradigm2" | "paradigm3" | "paradigm4",
  level: "absent" | "present" | "central",
  justification: string,
  modelVersion: string
): Promise<ParadigmClassification> {
  const sb = getSupabase();
  const { data: piece, error: pErr } = await sb.from("pieces").select("id").eq("id", pieceId).maybeSingle();
  if (pErr) throw new Error(`[db] createParadigmClassification lookup failed: ${pErr.message}`);
  if (!piece) throw new Error(`Piece with ID ${pieceId} not found.`);

  // Upsert on the (piece_id, paradigm, model_version) unique constraint —
  // replaces the old JSON approach's manual filter-then-push.
  const { data, error } = await sb
    .from("paradigm_classifications")
    .upsert(
      {
        piece_id: pieceId,
        paradigm,
        level,
        justification: justification.trim(),
        model_version: modelVersion,
      } as any,
      { onConflict: "piece_id,paradigm,model_version" }
    )
    .select()
    .single();
  if (error) throw new Error(`[db] createParadigmClassification upsert failed: ${error.message}`);
  return mapPC(data);
}

// --- Deletion API ---
// Both corpora and pieces cascade at the DB level (on delete cascade on
// contributors/pieces/analyses/paradigm_classifications' FKs) — deleting
// the parent row is enough; Postgres removes the rest.

export async function deletePiece(pieceId: string): Promise<{ deleted: boolean; title: string | null }> {
  const sb = getSupabase();
  const { data: piece, error: findErr } = await sb.from("pieces").select("id, title").eq("id", pieceId).maybeSingle();
  if (findErr) throw new Error(`[db] deletePiece lookup failed: ${findErr.message}`);
  if (!piece) return { deleted: false, title: null };

  const { error } = await sb.from("pieces").delete().eq("id", pieceId);
  if (error) throw new Error(`[db] deletePiece failed: ${error.message}`);
  return { deleted: true, title: (piece as any).title as string };
}

export async function deleteCorpus(corpusId: string): Promise<{ deleted: boolean; name: string | null }> {
  const sb = getSupabase();
  const { data: corpus, error: findErr } = await sb.from("corpora").select("id, name").eq("id", corpusId).maybeSingle();
  if (findErr) throw new Error(`[db] deleteCorpus lookup failed: ${findErr.message}`);
  if (!corpus) return { deleted: false, name: null };

  const { error } = await sb.from("corpora").delete().eq("id", corpusId);
  if (error) throw new Error(`[db] deleteCorpus failed: ${error.message}`);
  return { deleted: true, name: (corpus as any).name as string };
}
