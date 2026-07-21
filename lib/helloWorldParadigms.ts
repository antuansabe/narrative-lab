// Shared Hello World paradigm metadata — used by the ecosystem page's
// distribution stats AND the reusable PieceDetail component's per-piece
// classification display. Single source so labels never drift between them.
export const PARADIGM_LABELS = {
  paradigm1: {
    title: "1. Migrantes como Agentes de Cambio",
    desc: "Sujetos activos con capacidad de transformar su entorno frente a víctimas o amenazas pasivas.",
  },
  paradigm2: {
    title: "2. El Movimiento como Experiencia Compartida",
    desc: "Migración como fenómeno que conecta a toda la sociedad en lugar de ser exclusivo de 'los otros'.",
  },
  paradigm3: {
    title: "3. El Valor del Conocimiento Migrante",
    desc: "Visibilización de los saberes y aportes únicos de los migrantes más allá del valor laboral.",
  },
  paradigm4: {
    title: "4. Identidades Fluidas como Motor de Cambio",
    desc: "Reconocimiento de identidades transnacionales y dinámicas frente a etiquetas homogéneas.",
  },
} as const;
