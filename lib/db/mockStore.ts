// Mock JSON database store for local development in Phase 3.
// To be replaced with Supabase in Phase 2 later.
// Operates on data/db.json relative to project root.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { GenreTag } from "../types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

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

export interface DbSchema {
  corpora: Corpus[];
  contributors: Contributor[];
  pieces: Piece[];
  analyses: Analysis[];
}

function initDb(): DbSchema {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const defaultData: DbSchema = {
      corpora: [],
      contributors: [],
      pieces: [],
      analyses: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
  try {
    const contents = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(contents);
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    const defaultData: DbSchema = {
      corpora: [],
      contributors: [],
      pieces: [],
      analyses: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
}

export function readDb(): DbSchema {
  return initDb();
}

export function writeDb(data: DbSchema): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// --- Corpus API ---
export function getCorpora(): Corpus[] {
  const db = readDb();
  return db.corpora;
}

export function createCorpus(name: string): Corpus {
  const db = readDb();
  const newCorpus: Corpus = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  db.corpora.push(newCorpus);
  writeDb(db);
  return newCorpus;
}

// --- Contributor API ---
export function getContributors(corpusId?: string): Contributor[] {
  const db = readDb();
  if (corpusId) {
    return db.contributors.filter((c) => c.corpusId === corpusId);
  }
  return db.contributors;
}

export function createContributor(
  corpusId: string,
  name: string,
  senderType: "journalist" | "organization" | "other"
): Contributor {
  const db = readDb();
  const corpus = db.corpora.find((c) => c.id === corpusId);
  if (!corpus) {
    throw new Error(`Corpus with ID ${corpusId} not found.`);
  }
  const newContributor: Contributor = {
    id: crypto.randomUUID(),
    corpusId,
    name: name.trim(),
    senderType,
    createdAt: new Date().toISOString(),
  };
  db.contributors.push(newContributor);
  writeDb(db);
  return newContributor;
}

// --- Piece API ---
export function getPieces(contributorId?: string): Piece[] {
  const db = readDb();
  if (contributorId) {
    return db.pieces.filter((p) => p.contributorId === contributorId);
  }
  return db.pieces;
}

export function createPiece(
  corpusId: string,
  contributorId: string,
  title: string,
  text: string,
  genreTag: GenreTag,
  format: "article" | "audiovisual" | "social"
): Piece {
  const db = readDb();
  const contributor = db.contributors.find((c) => c.id === contributorId);
  if (!contributor) {
    throw new Error(`Contributor with ID ${contributorId} not found.`);
  }
  const newPiece: Piece = {
    id: crypto.randomUUID(),
    corpusId,
    contributorId,
    title: title.trim(),
    text: text.trim(),
    genreTag,
    format,
    createdAt: new Date().toISOString(),
  };
  db.pieces.push(newPiece);
  writeDb(db);
  return newPiece;
}

// --- Analysis API ---
export function getAnalysisForPiece(pieceId: string): Analysis | null {
  const db = readDb();
  return db.analyses.find((a) => a.pieceId === pieceId) ?? null;
}

export function createAnalysis(
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
): Analysis {
  const db = readDb();
  const newAnalysis: Analysis = {
    id: crypto.randomUUID(),
    pieceId,
    enactmentScore,
    d1,
    d2,
    d3,
    d4,
    d5,
    eachOrientation,
    genreTag,
    rawJson,
    schemaVersion,
    modelVersion,
    createdAt: new Date().toISOString(),
  };
  db.analyses.push(newAnalysis);
  writeDb(db);
  return newAnalysis;
}
