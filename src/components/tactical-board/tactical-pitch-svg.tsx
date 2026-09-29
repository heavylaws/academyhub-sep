import React from "react";
import type { PitchType } from "@/domain/tactics/tactical-domain.ts";

interface TacticalPitchSvgProps {
  pitchType?: PitchType;
  showHeatmap?: boolean;
  heatmapData?: Array<{ x: number; y: number; intensity: number }>;
}

export const TacticalPitchSvg: React.FC<TacticalPitchSvgProps> = ({
  pitchType = "full",
  showHeatmap = false,
  heatmapData = [],
}) => {
  // SVG coordinates: 0..1000 width, 0..650 height (standard 105m x 68m approx 1.54 aspect ratio)
  const width = 1000;
  const height = 650;

  // Grass stripes (10 vertical alternating stripes)
  const stripeWidth = width / 10;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full select-none pointer-events-none rounded-xl overflow-hidden shadow-inner"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Grass colors */}
        <pattern
          id="grassStripes"
          width={stripeWidth * 2}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <rect width={stripeWidth} height={height} fill="#1b4d2e" />
          <rect x={stripeWidth} width={stripeWidth} height={height} fill="#1e5433" />
        </pattern>

        {/* Heatmap gradient */}
        <radialGradient id="heatGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#eab308" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>

        {/* Arrowheads for tactical lines */}
        <marker
          id="arrow-white"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#FFFFFF" />
        </marker>
        <marker
          id="arrow-yellow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#FBBF24" />
        </marker>
        <marker
          id="arrow-blue"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#60A5FA" />
        </marker>
        <marker
          id="arrow-green"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#34D399" />
        </marker>
      </defs>

      {/* Pitch Grass Base */}
      <rect width={width} height={height} fill="url(#grassStripes)" />

      {/* Boundary Outer Line */}
      {pitchType !== "rondo_grid" && (
        <>
          {/* Main pitch border with padding (padding 25 on X and Y) */}
          <rect
            x={25}
            y={25}
            width={950}
            height={600}
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />

          {/* Halfway line */}
          <line
            x1={500}
            y1={25}
            x2={500}
            y2={625}
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />

          {/* Center circle (radius 91.5 approx scaled to 85) */}
          <circle
            cx={500}
            cy={325}
            r={88}
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Center spot */}
          <circle cx={500} cy={325} r={4} fill="rgba(255, 255, 255, 0.9)" />

          {/* LEFT GOAL & PENALTY AREA (Defending Team) */}
          {/* Left Goal net */}
          <rect
            x={5}
            y={275}
            width={20}
            height={100}
            fill="rgba(255, 255, 255, 0.15)"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth={2}
          />
          {/* Left 18-Yard Box */}
          <rect
            x={25}
            y={160}
            width={160}
            height={330}
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Left 6-Yard Box */}
          <rect
            x={25}
            y={235}
            width={55}
            height={180}
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Left Penalty Spot */}
          <circle cx={135} cy={325} r={4} fill="rgba(255, 255, 255, 0.9)" />
          {/* Left Penalty Arc (D-box) */}
          <path
            d="M 185 260 A 88 88 0 0 1 185 390"
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />

          {/* RIGHT GOAL & PENALTY AREA (Attacking Team) */}
          {/* Right Goal net */}
          <rect
            x={975}
            y={275}
            width={20}
            height={100}
            fill="rgba(255, 255, 255, 0.15)"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth={2}
          />
          {/* Right 18-Yard Box */}
          <rect
            x={815}
            y={160}
            width={160}
            height={330}
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Right 6-Yard Box */}
          <rect
            x={920}
            y={235}
            width={55}
            height={180}
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Right Penalty Spot */}
          <circle cx={865} cy={325} r={4} fill="rgba(255, 255, 255, 0.9)" />
          {/* Right Penalty Arc */}
          <path
            d="M 815 260 A 88 88 0 0 0 815 390"
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />

          {/* Corner Arcs */}
          {/* Top-Left */}
          <path
            d="M 25 40 A 15 15 0 0 0 40 25"
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Bottom-Left */}
          <path
            d="M 25 610 A 15 15 0 0 1 40 625"
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Top-Right */}
          <path
            d="M 960 25 A 15 15 0 0 0 975 40"
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
          {/* Bottom-Right */}
          <path
            d="M 960 625 A 15 15 0 0 1 975 610"
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth={3}
          />
        </>
      )}

      {/* Rondo Grid Overlay */}
      {pitchType === "rondo_grid" && (
        <>
          <rect
            x={150}
            y={100}
            width={700}
            height={450}
            fill="rgba(0, 0, 0, 0.1)"
            stroke="#FFFFFF"
            strokeWidth={3}
          />
          {/* 4 Quadrants */}
          <line
            x1={500}
            y1={100}
            x2={500}
            y2={550}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth={2}
            strokeDasharray="6 6"
          />
          <line
            x1={150}
            y1={325}
            x2={850}
            y2={325}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth={2}
            strokeDasharray="6 6"
          />
          {/* Center possession zone */}
          <circle
            cx={500}
            cy={325}
            r={65}
            fill="none"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth={2}
          />
        </>
      )}

      {/* Tactical Zones overlay (Five corridors: Flank, Half-space, Center, Half-space, Flank) */}
      <g opacity={0.15}>
        <line x1={25} y1={145} x2={975} y2={145} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
        <line x1={25} y1={235} x2={975} y2={235} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
        <line x1={25} y1={415} x2={975} y2={415} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
        <line x1={25} y1={505} x2={975} y2={505} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
      </g>

      {/* Heatmap overlay if enabled */}
      {showHeatmap && heatmapData.length > 0 && (
        <g className="transition-opacity duration-300">
          {heatmapData.map((pt, i) => (
            <circle
              key={i}
              cx={(pt.x / 100) * width}
              cy={(pt.y / 100) * height}
              r={pt.intensity * 70}
              fill="url(#heatGradient)"
            />
          ))}
        </g>
      )}
    </svg>
  );
};
