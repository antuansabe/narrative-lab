import type { Config } from "tailwindcss";

/**
 * NARRATIVE LAB — DESIGN TOKENS (PROVISIONAL — decision 1b.3 in BUILD_PLAN)
 *
 * Deliberately distinct from CAS (cream #F4EFE3 / terracotta #C44536 / teal #2A4F4F).
 * Shared: the Ashoka type system (Fraunces display, IBM Plex Sans body,
 * IBM Plex Mono labels) → institutional family resemblance.
 * Distinct: palette → separate product identity.
 *
 * IMPORTANT: red/blue are RESERVED as heat-map data semantics
 * (red = concentrated, blue = dispersed, per Giselle's brief §2.2).
 * The UI primary must never compete with data colors.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F1", // background — warm paper, lighter than CAS cream
        ink: "#23212B", // primary text — editorial ink
        primary: "#43366F", // deep indigo-violet — UI actions, headers
        "primary-soft": "#EDEAF5",
        accent: "#C99435", // amber — highlights, badges, callouts
        "line": "#E4DFD3", // hairline dividers
        // Heat-map data scale endpoints (semantic, not decorative):
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
