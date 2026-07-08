// Extracted from CAS (scoring-matrix-demo) lib/prompts/narrative-context.ts @ 42cce10, 2026-07-07
/**
 * COMPRESSED distillation of Ashoka's three Core Narratives (~250 tokens).
 * Appended to the scorer system prompt to calibrate qualitative interpretation
 * of the text without changing the rubric scores, weights, or dimensions.
 */
export const NARRATIVE_CONTEXT = `Ashoka's framework change strategy is structured around three key societal shifts, or Core Narratives. Use this context to calibrate your qualitative reading of the dimensions.

1. Lifelong Contribution: Agency is not deferred to adulthood. Active changemaking is a lifelong process beginning in youth. Shift away from viewing youth as passive beneficiaries or "future leaders" toward present-tense active contributors.
   - Relates to: D1 (Agency & Contribution) + D5 (Identity Embodiment)

2. Changemaker Networks: Collaborative power replaces heroic individual leadership. Shift away from single command hierarchies or mentoring relationships toward fluid networks of teams sharing power across generations.
   - Relates to: D2 (Systemic & Architectural Framing) + D4 (Collaboration & Leadership)

3. Empathy-based Societies: Active, conscious empathy is the foundation of changemaking. Shift away from simple emotional sympathy or charity toward conscious empathy that identifies exclusion patterns and dynamically adjusts approaches.
   - Relates to: D3 (Empathy Enactment) + D1 (Agency & Contribution)

Instruction: This narrative context serves as a calibration lens to guide your interpretation of the text's grammar, metaphors, and narrative positioning. It does NOT add new scoring dimensions or modify the existing 0-4 rubrics or weights.`;
