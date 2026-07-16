import type { Config } from "tailwindcss";

/**
 * NARRATIVE LAB — DESIGN TOKENS
 *
 * Updated 2026-07-16: primary palette aligned to Ashoka's institutional
 * colors (same values as CAS's app/globals.css) for brand consistency
 * now that this ships to production, not just an internal experiment.
 * Shared: the Ashoka type system (Fraunces display, IBM Plex Sans body,
 * IBM Plex Mono labels) AND the institutional palette → visibly part
 * of the same family of tools as CAS.
 *
 * IMPORTANT: red/blue remain RESERVED as heat-map data semantics
 * (red = concentrated, blue = dispersed, per Giselle's brief §2.2) and
 * are kept as their OWN distinct tokens (heat-hot/heat-cold), separate
 * from the decorative primary/accent — Ashoka Blue (#0A3558) is a much
 * darker navy than heat-cold's brighter royal blue, so the two remain
 * visually distinguishable and the data-vs-decoration line still holds.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F1", // background — warm paper
        ink: "#23212B", // primary text — editorial ink
        primary: "#0A3558", // Ashoka Blue — UI actions, headers
        "primary-soft": "#EEF3F8",
        accent: "#E87722", // Ashoka Orange — highlights, badges, callouts
        "line": "#E4DFD3", // hairline dividers
        // Heat-map data scale endpoints (semantic, not decorative —
        // do not reuse for UI chrome):
        "heat-hot": "#B33A3A",
        "heat-cold": "#3A5FB3",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-plex-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
