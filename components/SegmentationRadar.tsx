"use client";

import { useEffect, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface SeriesData {
  name: string;
  // Record mapping "D1"-"D5" to average scores
  scores: Record<string, number>;
  color: string;
  strokeDasharray?: string;
}

interface SegmentationRadarProps {
  title: string;
  subtitle: string;
  series: SeriesData[];
}

const DIMENSION_LABELS: Record<string, string> = {
  D1: "Agencia (D1)",
  D2: "Sistémico (D2)",
  D3: "Empatía (D3)",
  D4: "Colaboración (D4)",
  D5: "Identidad (D5)",
};

export function SegmentationRadar({ title, subtitle, series }: SegmentationRadarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dimKeys = ["D1", "D2", "D3", "D4", "D5"];

  // Format data for Recharts:
  // e.g. [ { dimension: "Agencia (D1)", "Periodista": 2.5, "Organización": 2.0 }, ... ]
  const data = dimKeys.map((key) => {
    const row: Record<string, any> = {
      dimension: DIMENSION_LABELS[key] || key,
    };
    for (const s of series) {
      row[s.name] = s.scores[key] || 0;
    }
    return row;
  });

  return (
    <div className="border border-zinc-200 bg-white rounded-xl p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          {title}
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          {subtitle}
        </p>
      </div>

      <div className="h-[320px] w-full flex items-center justify-center relative">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%">
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

              {/* Dynamically draw a Radar for each series segment */}
              {series.map((s, idx) => (
                <Radar
                  key={s.name}
                  name={s.name}
                  dataKey={s.name}
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeDasharray={s.strokeDasharray}
                  fill={s.color}
                  fillOpacity={0.06}
                  dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                  animationDuration={400}
                  animationEasing="ease-out"
                />
              ))}
              
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  paddingTop: 16,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-zinc-400 text-sm">Cargando comparación...</div>
        )}
      </div>
    </div>
  );
}
