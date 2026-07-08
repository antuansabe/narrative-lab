# CLAUDE.md — Narrative Lab

Canonical rules for every Claude Code / agent session in this repo.
Read this file FIRST in every session. Then read `NARRATIVE_LAB_BUILD_PLAN.md`.

## What this project is

Narrative Lab is a standalone platform for **corpus-level narrative analysis**,
extracted from CAS (`antuansabe/scoring-matrix-demo`) in July 2026. First
deployment: the Hola América Narrative Lab pilot (session: July 22, 2026).

- CAS = longitudinal, per-subject, internal Ashoka baselines. **Frozen. Never touched from here.**
- Narrative Lab = batch/corpus, ecosystem diagnostics, external participants, own Vercel deploy.

## Non-negotiables

1. **Mirror, not monitor.** All copy frames the tool as a collective mirror.
   No individual critique surfaces in group-facing views. Aggregate first.
2. **Framework authority is Giselle Kuri's.** Never invent methodology:
   no weights, no numeric mappings for Absent/Present/Central, no thresholds,
   no aggregation formulas beyond what the brief or a closed decision states.
   If a phase needs one → STOP, mark as `PENDING (Giselle)` in the plan, ask.
3. **Technical authority is Antonio's.** Architecture decisions marked
   `PENDING (Antonio)` are answered by him, not assumed.
4. **Gate pattern.** Commit locally per phase, then STOP at the review gate.
   NEVER push without Antonio's explicit approval. Never batch multiple
   phases into one session.
5. **Evidence, not claims.** Every phase ends with runnable evidence
   (command + output) — not "this should work."
6. **Provenance.** Any file copied from CAS gets a header comment:
   `// Extracted from CAS (scoring-matrix-demo) <path> @ <commit-short-sha>, <date>`
   and is logged in `docs/PROVENANCE.md`.

## Session protocol

1. Read `CLAUDE.md` → read `NARRATIVE_LAB_BUILD_PLAN.md` → find current phase.
2. Pre-flight audit: read every file the phase will touch. Report findings
   before writing anything.
3. Implement ONE phase only.
4. Produce evidence (typecheck, dev server, curl on routes, screenshots).
5. Update the phase status tracker in the plan.
6. Local commit with a scoped message (`phase-N: <summary>`).
7. STOP. Review gate. No push.

## Visual system (provisional — see plan decision 1b.3)

- Background `paper #FAF7F1` · text `ink #23212B`
- Primary `indigo-violet #43366F` · accent `amber #C99435` · hairlines `#E4DFD3`
- **Reserved data semantics:** heat-map red `#B33A3A` (concentrated) /
  blue `#3A5FB3` (dispersed). Never use red/blue as decorative UI colors.
- Fonts: Fraunces (display), IBM Plex Sans (body), IBM Plex Mono (labels) —
  loaded via `next/font` in `app/layout.tsx`.
- Deliberately distinct from CAS palette (cream/terracotta/teal). Type system
  is shared for institutional family resemblance.

## Architecture conventions (inherited from CAS)

- Lazy singleton Anthropic client; config errors throw `AnthropicConfigError`.
- Retry with exponential backoff; concurrency capped with `pLimit = 2`.
- Scoring calls: temperature 0, ephemeral prompt caching.
- Model split: Sonnet for scoring/synthesis, Haiku for quote extraction.
- `schemaVersion` + `modelVersion` recorded on every stored analysis JSON.
- Word counting lives in `lib/text.ts` (`countWords`) — do not reimplement.
- DB constraints at the database level, not just UI filtering.

## Environment gotchas (learned the hard way in CAS)

- Repo must live under `~/Developer/` — NEVER in an iCloud-synced path
  (Desktop/Documents). iCloud filesystem virtualization breaks Node IPC.
- Antonio's shell exports `NODE_ENV=production` globally → `.npmrc` here
  sets `production=false` so devDependencies install. Do not delete `.npmrc`.
- Desktop Commander: prefix every git command with an explicit `cd`.

## Language

- Code, comments, commits, UI copy: **English**.
- Session materials for participants and anything Giselle reviews: **Spanish**.
- Analysis pipeline must handle **Spanish-language source texts** natively
  (Hola América corpus is Spanish-first; some English pieces possible).
