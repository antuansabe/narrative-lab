# NARRATIVE LAB — BUILD PLAN

Owner (architecture): Antonio Dromundo · Owner (framework): Giselle Kuri
Source brief: "Narrative Lab — Actualización y ajustes" (Giselle Kuri, 2026-06-16)
Pilot: Hola América · First session: **Wednesday, July 22, 2026** · Materials arrive: **~week of July 13**

---

## 0. Status tracker

| Phase | Name                                      | Status      | Evidence |
|-------|-------------------------------------------|-------------|----------|
| 0     | Foundation scaffold                       | ✅ done      | `npm run build` passes; `/api/health` returns ok |
| 1     | Pipeline extraction from CAS              | ✅ done      | Typecheck passes; scratch E2E script scores sample Spanish text using Sonnet client |
| 2     | Supabase (own project) + schema           | ⬜ pending   | (Deferred by user request, using local mock JSON store) |
| 3     | Corpus intake (batch)                     | ✅ done      | Local JSON db + intake UI + API endpoints. Runner script scored and stored 6 pieces across 2 contributors. |
| 4     | Hello World paradigm classifier (§2.1)    | ✅ done      | Verbatim Anexo A prompts + classifier runner + db classifications. Script processed 6 database pieces; test script verified migrant text. |
| 5     | Ecosystem view: heat-map + stats (§2.2)   | ✅ done      | Dynamic API endpoint (mean/SD stats) + Recharts layered radar rendering for SD ribbon glow + paradigm stacked bars + facilitator toggle. |
| 6     | Segmentation + coherence (§2.3)           | ✅ done      | Sub-graph averages (senderType & format) + SegmentationRadar multi-series overlaid chart + intra-author coherence calculations (standard deviation classification) with outlier detection. |
| 7     | Session materials + copy pass             | ⬜ pending   | |
| 8     | Vercel deploy + E2E smoke                 | ⬜ pending   | |

Hard sequencing: Phases 1–5 MUST land before materials arrive (~July 13–15).
Phases 6–7 land before July 20. Phase 8 can overlap 6–7.

---

## 1. Session protocol (identical to CAS — non-negotiable)

1. Read `CLAUDE.md` → read this plan → locate current phase.
2. **Pre-flight audit:** read every file this phase touches. Report findings.
3. Implement **ONE** phase.
4. **Evidence, not claims:** commands run + output shown.
5. Update status tracker above.
6. Local commit (`phase-N: <summary>`). **STOP at review gate. NEVER push.**

---

## 1b. Decisions

### Closed (agreed July 7, 2026)

| # | Decision | Resolution | Rationale |
|---|----------|-----------|-----------|
| C1 | Repo strategy | **Separate repo** (`narrative-lab`), separate Vercel project | Independent deploy cadence, different audience, clean history; CAS is frozen for Sept 1 baselines and must carry zero risk from this work |
| C2 | Database | **Own Supabase project** | Data governance differs: Hola América materials belong to external journalists/orgs under pilot consent — must not share an RLS surface, backups, or access keys with Diamond baseline data |
| C3 | Pipeline reuse | **Copy as snapshot with provenance headers** (`lib/scoring`, `lib/prompts`, Anthropic client, `lib/text.ts`), not a shared package | Two products, one team of ~1 dev: a shared npm package is premature coupling; snapshot + `docs/PROVENANCE.md` keeps lineage auditable |
| C4 | UI reuse | **Extract and adapt** from CAS `/batch` (BatchView) and `/badge` components — reference, don't wholesale copy | That code was written for CAS's information architecture; Narrative Lab's IA is corpus-first |
| C5 | Paradigm module independence | Runs **independent** of the 5-dimension pipeline (per brief §2.1: "ambos análisis son complementarios, pero no dependen uno del otro") | Explicit in brief |
| C6 | Group-facing views show **aggregate only** | Per brief §1.2: results are pre-built visualizations, collective analysis, "no vamos a dar crítica individual" | Explicit in brief + mirror-not-monitor |

### Open — PENDING (Giselle) — conceptual / methodology

| # | Question | Why it blocks | Needed by |
|---|----------|---------------|-----------|
| G1 | Does Absent/Present/Central map to numbers for aggregation, or stay categorical (reported as % of pieces per level)? | Phase 5 stats; DEFAULT until answered: **categorical, percentages only** — no invented numeric scale | Phase 4 |
| G2 | Heat-map definition of "concentrated" vs "dispersed": what statistic drives red/blue? (e.g., density of pieces per score band per dimension) | Phase 5 rendering; I can propose 2–3 statistical options, she picks | Phase 5 |
| G3 | Coherence flag threshold: how much variance across a person's 3 pieces counts as "inconsistent"? | Phase 6 | Phase 6 |
| G4 | Segmentation taxonomy: final list of sender types (journalist / org / other?) and formats (article / audiovisual / social post?) — align with Lucia | Phase 3 metadata fields | Phase 3 |
| G5 | Output language of justifications and synthesis: Spanish-only, or match source language? | Phase 4 prompts; DEFAULT: **Spanish** | Phase 4 |
| G6 | Are per-piece paradigm classifications ever shown to participants (private view), or facilitators only? | Phase 5/7 access design | Phase 5 |

### Open — PENDING (Antonio) — technical

| # | Question | Recommendation |
|---|----------|----------------|
| A1 | Visual identity sign-off (provisional palette in `tailwind.config.ts`) | Keep shared type system + distinct indigo/amber palette; confirm with Giselle only for look-and-feel comfort, not authority |
| A2 | Model for paradigm classification | Sonnet, temperature 0 — categorical judgment with justification is judgment-heavy, not extraction; benchmark Haiku later if cost matters at 60 pieces × 4 paradigms |
| A3 | Heat-map rendering | Custom SVG layer over the existing Recharts radar (Recharts alone can't do density overlays cleanly) |
| A4 | Intake format | Paste-in text + optional file upload later; 60 pieces arrive as text — don't build audiovisual transcription, transcripts arrive as text per brief §1.1 |

---

## 2. Phases

### Phase 0 — Foundation scaffold ✅
Next.js 15 + TS + Tailwind, three-font system, provisional tokens,
`/api/health`, `lib/version.ts` (MODEL_VERSION, SCHEMA_VERSION), `.npmrc`
guardrail, CLAUDE.md, this plan.
**Evidence:** `npm run build` clean; `curl /api/health` → `status: ok`.

### Phase 1 — Pipeline extraction from CAS
Copy (with provenance headers + `docs/PROVENANCE.md`):
- `lib/scoring/*` (5-dimension model D1–D5, Enactment Score, Lens A/B)
- `lib/prompts/*`
- Anthropic client (lazy singleton, `AnthropicConfigError`, retry/backoff, pLimit 2, ephemeral caching)
- `lib/text.ts` (`countWords`)
Adapt imports; NO logic changes. Keep `effectiveGenreTag` behavior exactly
as fixed in CAS (Lens A bug: lens reflects model's effective genre, never
the user-selected material genre).
**Evidence:** typecheck clean; one-off script scores a sample Spanish text end-to-end.
**Gate:** diff review — any line that differs from CAS beyond imports/paths must be justified.

### Phase 2 — Supabase (own project) + schema
New Supabase project (Narrative Lab only). Schema (repository layer, RLS, pgcrypto):
- `corpora` (pilot = "Hola América 2026-07")
- `contributors` (person/org, sender_type — enum pending G4)
- `pieces` (belongs to contributor + corpus; format enum pending G4; genre tag; language; raw text; contextual notes)
- `analyses` (piece FK; 5D scores JSON; schemaVersion; modelVersion)
- `paradigm_classifications` (piece FK; paradigm 1–4; level enum `absent|present|central`; justification text; modelVersion)
Constraint at DB level: a piece belongs to exactly one corpus; classifications
unique per (piece, paradigm, modelVersion).
**Evidence:** migrations applied; insert/read round-trip script.

### Phase 3 — Corpus intake (batch)
Batch entry UI: create corpus → add contributor → paste 3 pieces with
metadata. Progress states, per-piece scoring trigger reusing Phase 1 pipeline.
Metadata fields per G4 (build with placeholder enums, easy to rename).
**Evidence:** 6 sample pieces (2 contributors × 3) stored and scored.

### Phase 4 — Hello World paradigm classifier (brief §2.1 + Anexo A)
Independent module (C5). For each piece × 4 paradigms:
- Classify `absent | present | central` strictly per Anexo A indicators/scale
  (the Anexo A text ships verbatim into the prompt — no paraphrasing the criteria).
- 1–2 line justification grounded in the piece's content (quote-anchored,
  demographic-fidelity constraint carried over from CAS).
- Store with modelVersion. Categorical only (G1 default) — no numeric mapping.
**Evidence:** classification run over the Phase 3 sample; spot-check justifications
against Anexo A; flag any ambiguity for Giselle rather than resolving silently.

### Phase 5 — Ecosystem view (brief §2.2)
- Single radar for the whole corpus with **heat-map overlay**: red = concentrated,
  blue = dispersed (statistic per G2 — present Giselle 2–3 options with mock
  visuals before implementing the final one).
- Presence/absence percentage stats per paradigm ("X% of pieces…").
- Model-version mismatch warning (inherited CAS pattern).
- Aggregate-only by default (C6); per-piece drill-down behind facilitator
  access pending G6.
**Evidence:** ecosystem view rendering the sample corpus; screenshot.

### Phase 6 — Segmentation + coherence (brief §2.3)
- Cut all stats by sender_type and format (Genre Tag aware).
- Intra-contributor coherence: variance across each person's 3 pieces,
  surfaced as a finding for group conversation (threshold pending G3 —
  until then show the spread, no "inconsistent" label).
**Evidence:** segmented views on sample data with deliberately divergent pieces.

### Phase 7 — Session materials + copy pass
- Print/export-friendly views of the ecosystem visuals for the July 22 session.
- Full copy pass: mirror-not-monitor, Spanish participant-facing materials,
  Giselle reviews all Spanish copy.
- Draft conversation-question scaffolds only AFTER real data exists (per brief §1.2.4).
**Evidence:** exported visuals PDF; copy inventory reviewed.

### Phase 8 — Deploy
New Vercel project, env vars, domain, E2E smoke on production:
health → intake → classify → ecosystem view.
**Evidence:** production URL + smoke results.

---

## 3. Guardrails

1. Never modify CAS from this repo or these sessions.
2. Never invent methodology — Anexo A is applied verbatim; anything beyond it is PENDING (Giselle).
3. Aggregate-first: no individual-critique surface in group-facing views.
4. Spanish-first pipeline: prompts tested on Spanish source texts from Phase 1.
5. Provenance headers on every extracted file.
6. Local commits only; push requires Antonio's explicit approval.
7. Version pinning: modelVersion + schemaVersion on every stored result.
8. Red/blue reserved for heat-map semantics.

---

## 4. Timeline reality check (today: July 7)

- **July 7–12:** Phases 1–2 (pipeline + DB). Tight but mechanical.
- **~July 13:** materials may start arriving → Phase 3 must be usable.
- **July 13–17:** Phases 4–5 on real data.
- **July 18–20:** Phases 6–7; Giselle picks G2 option; question design starts.
- **July 21:** freeze; Phase 8 smoke on production.
- **July 22:** session.

The critical path is G1/G2/G4 answers from Giselle — request them THIS WEEK.
