/**
 * Version pinning — same discipline as CAS.
 * Every stored analysis records the model + schema version that produced it,
 * so aggregate views can warn on version mismatches (inherited pattern from
 * CAS Phase 4 comparative view).
 */
export const MODEL_VERSION = "claude-sonnet-4-6" as const;
export const SCHEMA_VERSION = "nl-0.1.0" as const;

/** App-level identity, used in health check and footer. */
export const APP_NAME = "Narrative Lab" as const;
export const APP_PHASE = "Phase 0 — Foundation" as const;
