"use client";

import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface EcosystemRadarProps {
  dimensions: {
    D1: { mean: number; stdDev: number };
    D2: { mean: number; stdDev: number };
    D3: { mean: number; stdDev: number };
    D4: { mean: number; stdDev: number };
    D5: { mean: number; stdDev: number };
  };
}

const DIMENSION_LABELS = {
  D1: "Agencia y Contribución (D1)",
  D2: "Marco Sistémico (D2)",
  D3: "Práctica de Empatía (D3)",
  D4: "Colaboración y Liderazgo (D4)",
  D5: "Encarnación de Identidad (D5)",
};

export function EcosystemRadar({ dimensions }: EcosystemRadarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Calculate average standard deviation to determine color of the overall glow
  const sds = [
    dimensions.D1.stdDev,
    dimensions.D2.stdDev,
    dimensions.D3.stdDev,
    dimensions.D4.stdDev,
    dimensions.D5.stdDev,
  ];
  const avgStdDev = sds.reduce((acc, val) => acc + val, 0) / sds.length;

  // Determine concentration color based on G2 rules
  // Red = Concentrated (low SD), Blue = Dispersed (high SD)
  let glowColor = "#8B5CF6"; // Default purple
  let glowLabel = "Dispersión Moderada";
  let glowClass = "text-purple-600 bg-purple-50 border-purple-200";

  if (avgStdDev <= 0.7) {
    glowColor = "#EF4444"; // Red (highly concentrated)
    glowLabel = "Alta Concentración (Narrativas Homogéneas)";
    glowClass = "text-red-600 bg-red-50 border-red-200";
  } else if (avgStdDev > 1.1) {
    glowColor = "#3B82F6"; // Blue (highly dispersed)
    glowLabel = "Alta Dispersión (Narrativas Diversas)";
    glowClass = "text-blue-600 bg-blue-50 border-blue-200";
  }

  // Format data for Recharts
  const data = (Object.keys(dimensions) as Array<keyof typeof DIMENSION_LABELS>).map((key) => {
    const mean = dimensions[key].mean;
    const stdDev = dimensions[key].stdDev;
    return {
      dimension: DIMENSION_LABELS[key],
      mean,
      // Lower bound clipped at 0
      lowerSd: Math.max(0, mean - stdDev),
      // Upper bound clipped at 4
      upperSd: Math.min(4, mean + stdDev),
    };
  });

  return (
    <div className="border border-zinc-200 bg-white rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Radar del Ecosistema
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Muestra el promedio de la comunidad de narradores y el rango de variación (desviación estándar).
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 self-start">
          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-medium ${glowClass}`}>
            {glowLabel} (σ promedio: {avgStdDev.toFixed(2)})
          </div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            provisional — pendiente de validación de Giselle
          </span>
        </div>
      </div>

      <div className="h-[320px] w-full flex items-center justify-center relative">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="75%">
              <PolarGrid stroke="#e4e4e7" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "#71717a", fontSize: 10, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                domain={[0, 4]}
                tickCount={5}
                tick={{ fill: "#a1a1aa", fontSize: 9 }}
                axisLine={false}
              />
              
              {/* Layer 1: Shaded area for Standard Deviation (Upper Bound) */}
              <Radar
                name="Desviación Superior"
                dataKey="upperSd"
                stroke="none"
                fill={glowColor}
                fillOpacity={0.18}
                connectNulls
              />

              {/* Layer 2: Mask out the center (Lower Bound) using card background color */}
              <Radar
                name="Desviación Inferior"
                dataKey="lowerSd"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1.0}
                connectNulls
              />

              {/* Layer 3: Solid mean score line */}
              <Radar
                name="Promedio"
                dataKey="mean"
                stroke="#E87722"
                strokeWidth={2}
                fill="none"
                dot={{ r: 3, fill: "#E87722", strokeWidth: 0 }}
                connectNulls
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-zinc-400 text-sm">Cargando radar...</div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-4 justify-center text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#E87722]"></span>
          <span className="text-zinc-600">Promedio (µ)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-3 rounded border border-dashed"
            style={{ backgroundColor: `${glowColor}1E`, borderColor: glowColor }}
          ></span>
          <span className="text-zinc-600">Variación Desviación Estándar (µ ± σ)</span>
        </div>
      </div>
    </div>
  );
}
