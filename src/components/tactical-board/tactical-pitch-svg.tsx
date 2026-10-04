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
  const width = 1000;
  const height = 650;
  const stripeWidth = width / 10;

  const isBasketball = pitchType === "basketball_full" || pitchType === "basketball_half";
  const isFutsal = pitchType === "futsal_court";
  const isHandball = pitchType === "handball_court";
  const isVolleyball = pitchType === "volleyball_court";
  const isRugby = pitchType === "rugby_pitch";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full select-none pointer-events-none rounded-xl overflow-hidden shadow-inner"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Grass stripes for Soccer & Rugby */}
        <pattern
          id="grassStripes"
          width={stripeWidth * 2}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <rect width={stripeWidth} height={height} fill="#1b4d2e" />
          <rect x={stripeWidth} width={stripeWidth} height={height} fill="#1e5433" />
        </pattern>

        {/* Rugby deep grass */}
        <pattern
          id="rugbyGrassStripes"
          width={stripeWidth * 2}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <rect width={stripeWidth} height={height} fill="#143e24" />
          <rect x={stripeWidth} width={stripeWidth} height={height} fill="#1a4d2d" />
        </pattern>

        {/* Basketball Hardwood Flooring Texture */}
        <pattern
          id="hardwoodFloor"
          width={100}
          height={20}
          patternUnits="userSpaceOnUse"
        >
          <rect width={100} height={20} fill="#c88b4b" />
          <line x1={0} y1={10} x2={100} y2={10} stroke="#b77a3d" strokeWidth={1} opacity={0.6} />
          <line x1={0} y1={20} x2={100} y2={20} stroke="#a76c32" strokeWidth={1.5} opacity={0.7} />
          <line x1={50} y1={0} x2={50} y2={10} stroke="#965f2a" strokeWidth={1} opacity={0.5} />
          <line x1={25} y1={10} x2={25} y2={20} stroke="#965f2a" strokeWidth={1} opacity={0.5} />
          <line x1={75} y1={10} x2={75} y2={20} stroke="#965f2a" strokeWidth={1} opacity={0.5} />
        </pattern>

        {/* Futsal & Handball Blue Court */}
        <linearGradient id="futsalFloor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#172e4b" />
        </linearGradient>

        <linearGradient id="handballFloor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#164e63" />
          <stop offset="100%" stopColor="#0e3a4b" />
        </linearGradient>

        {/* Volleyball Floor Gradient */}
        <linearGradient id="vballOuter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>

        {/* Heatmap gradient */}
        <radialGradient id="heatGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#eab308" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ======================= BASKETBALL ======================= */}
      {isBasketball && (
        <>
          <rect width={width} height={height} fill="url(#hardwoodFloor)" />
          {/* Court Boundary */}
          <rect
            x={40}
            y={35}
            width={920}
            height={580}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={4}
          />

          {pitchType === "basketball_full" ? (
            <>
              {/* Half-court division */}
              <line x1={500} y1={35} x2={500} y2={615} stroke="#FFFFFF" strokeWidth={3} />
              {/* Center Circle */}
              <circle cx={500} cy={325} r={75} fill="none" stroke="#FFFFFF" strokeWidth={3} />
              <circle cx={500} cy={325} r={25} fill="#b45309" opacity={0.3} stroke="#FFFFFF" strokeWidth={2} />

              {/* LEFT KEY & 3-PT */}
              <rect x={40} y={235} width={180} height={180} fill="#9a3412" opacity={0.4} stroke="#FFFFFF" strokeWidth={3} />
              <circle cx={220} cy={325} r={70} fill="none" stroke="#FFFFFF" strokeWidth={3} />
              <path
                d="M 40 85 L 140 85 A 250 250 0 0 1 140 565 L 40 565"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3}
              />
              <line x1={70} y1={290} x2={70} y2={360} stroke="#FFFFFF" strokeWidth={4} />
              <circle cx={88} cy={325} r={12} fill="none" stroke="#ea580c" strokeWidth={3} />

              {/* RIGHT KEY & 3-PT */}
              <rect x={780} y={235} width={180} height={180} fill="#9a3412" opacity={0.4} stroke="#FFFFFF" strokeWidth={3} />
              <circle cx={780} cy={325} r={70} fill="none" stroke="#FFFFFF" strokeWidth={3} />
              <path
                d="M 960 85 L 860 85 A 250 250 0 0 0 860 565 L 960 565"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3}
              />
              <line x1={930} y1={290} x2={930} y2={360} stroke="#FFFFFF" strokeWidth={4} />
              <circle cx={912} cy={325} r={12} fill="none" stroke="#ea580c" strokeWidth={3} />
            </>
          ) : (
            // Basketball Half Court
            <>
              <line x1={200} y1={35} x2={200} y2={615} stroke="#FFFFFF" strokeWidth={3} />
              <path
                d="M 200 250 A 75 75 0 0 1 200 400"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeDasharray="6 6"
              />
              <rect x={680} y={235} width={280} height={180} fill="#9a3412" opacity={0.4} stroke="#FFFFFF" strokeWidth={3} />
              <circle cx={680} cy={325} r={70} fill="none" stroke="#FFFFFF" strokeWidth={3} />
              <path
                d="M 960 85 L 680 85 A 320 320 0 0 0 680 565 L 960 565"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3.5}
              />
              <path d="M 920 285 A 40 40 0 0 0 920 365" fill="none" stroke="#FFFFFF" strokeWidth={2.5} />
              <line x1={925} y1={285} x2={925} y2={365} stroke="#FFFFFF" strokeWidth={5} />
              <circle cx={905} cy={325} r={14} fill="none" stroke="#ea580c" strokeWidth={3.5} />
              <circle cx={905} cy={325} r={4} fill="#ea580c" />
            </>
          )}
        </>
      )}

      {/* ======================= FUTSAL ======================= */}
      {isFutsal && (
        <>
          <rect width={width} height={height} fill="url(#futsalFloor)" />
          <rect x={35} y={30} width={930} height={590} fill="none" stroke="#FFFFFF" strokeWidth={3.5} />
          <line x1={500} y1={30} x2={500} y2={620} stroke="#FFFFFF" strokeWidth={3} />
          <circle cx={500} cy={325} r={65} fill="none" stroke="#FFFFFF" strokeWidth={3} />
          <circle cx={500} cy={325} r={4} fill="#FFFFFF" />

          {/* Left Goal Area */}
          <path
            d="M 35 225 L 95 225 A 100 100 0 0 1 95 425 L 35 425 Z"
            fill="#1e40af"
            opacity={0.3}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
          <circle cx={135} cy={325} r={4} fill="#FFFFFF" />
          <circle cx={235} cy={325} r={4} fill="#FFFFFF" />
          <rect x={15} y={280} width={20} height={90} fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" strokeWidth={2.5} />

          {/* Right Goal Area */}
          <path
            d="M 965 225 L 905 225 A 100 100 0 0 0 905 425 L 965 425 Z"
            fill="#1e40af"
            opacity={0.3}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
          <circle cx={865} cy={325} r={4} fill="#FFFFFF" />
          <circle cx={765} cy={325} r={4} fill="#FFFFFF" />
          <rect x={965} y={280} width={20} height={90} fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" strokeWidth={2.5} />
        </>
      )}

      {/* ======================= HANDBALL ======================= */}
      {isHandball && (
        <>
          <rect width={width} height={height} fill="url(#handballFloor)" />
          <rect x={35} y={30} width={930} height={590} fill="none" stroke="#FFFFFF" strokeWidth={3.5} />
          <line x1={500} y1={30} x2={500} y2={620} stroke="#FFFFFF" strokeWidth={3} />
          <circle cx={500} cy={325} r={4} fill="#FFFFFF" />

          {/* Left Goal Area */}
          <path
            d="M 35 200 L 95 200 A 125 125 0 0 1 95 450 L 35 450 Z"
            fill="#d97706"
            opacity={0.35}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
          <line x1={155} y1={315} x2={155} y2={335} stroke="#FFFFFF" strokeWidth={3} />
          <path
            d="M 35 150 L 150 150 A 175 175 0 0 1 150 500 L 35 500"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeDasharray="8 8"
          />
          <rect x={15} y={275} width={20} height={100} fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" strokeWidth={3} />

          {/* Right Goal Area */}
          <path
            d="M 965 200 L 905 200 A 125 125 0 0 0 905 450 L 965 450 Z"
            fill="#d97706"
            opacity={0.35}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
          <line x1={845} y1={315} x2={845} y2={335} stroke="#FFFFFF" strokeWidth={3} />
          <path
            d="M 965 150 L 850 150 A 175 175 0 0 0 850 500 L 965 500"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeDasharray="8 8"
          />
          <rect x={965} y={275} width={20} height={100} fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" strokeWidth={3} />
        </>
      )}

      {/* ======================= VOLLEYBALL ======================= */}
      {isVolleyball && (
        <>
          <rect width={width} height={height} fill="url(#vballOuter)" />
          <rect x={100} y={125} width={800} height={400} fill="#ea580c" stroke="#FFFFFF" strokeWidth={4} />
          <line x1={500} y1={125} x2={500} y2={525} stroke="#FFFFFF" strokeWidth={4} />
          <line x1={366} y1={125} x2={366} y2={525} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="8 4" />
          <line x1={634} y1={125} x2={634} y2={525} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="8 4" />
          <line x1={500} y1={105} x2={500} y2={545} stroke="#111827" strokeWidth={6} />
          <line x1={500} y1={105} x2={500} y2={545} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="4 4" />
          <circle cx={500} cy={125} r={5} fill="#ef4444" />
          <circle cx={500} cy={525} r={5} fill="#ef4444" />
        </>
      )}

      {/* ======================= RUGBY ======================= */}
      {isRugby && (
        <>
          <rect width={width} height={height} fill="url(#rugbyGrassStripes)" />
          <rect x={80} y={35} width={840} height={580} fill="none" stroke="#FFFFFF" strokeWidth={3.5} />
          <rect x={20} y={35} width={60} height={580} fill="#143e24" opacity={0.5} stroke="#FFFFFF" strokeWidth={2} />
          <rect x={920} y={35} width={60} height={580} fill="#143e24" opacity={0.5} stroke="#FFFFFF" strokeWidth={2} />
          <line x1={80} y1={35} x2={80} y2={615} stroke="#FFFFFF" strokeWidth={4} />
          <line x1={920} y1={35} x2={920} y2={615} stroke="#FFFFFF" strokeWidth={4} />
          <line x1={500} y1={35} x2={500} y2={615} stroke="#FFFFFF" strokeWidth={3} />
          <line x1={420} y1={35} x2={420} y2={615} stroke="#FFFFFF" strokeWidth={2} strokeDasharray="6 6" />
          <line x1={580} y1={35} x2={580} y2={615} stroke="#FFFFFF" strokeWidth={2} strokeDasharray="6 6" />
          <line x1={260} y1={35} x2={260} y2={615} stroke="#FFFFFF" strokeWidth={3} />
          <line x1={740} y1={35} x2={740} y2={615} stroke="#FFFFFF" strokeWidth={3} />
          <line x1={80} y1={290} x2={80} y2={360} stroke="#FFFFFF" strokeWidth={5} />
          <line x1={75} y1={325} x2={85} y2={325} stroke="#FFFFFF" strokeWidth={4} />
          <line x1={920} y1={290} x2={920} y2={360} stroke="#FFFFFF" strokeWidth={5} />
          <line x1={915} y1={325} x2={925} y2={325} stroke="#FFFFFF" strokeWidth={4} />
        </>
      )}

      {/* ======================= SOCCER: ATTACKING HALF ======================= */}
      {pitchType === "attacking_half" && (
        <>
          <rect width={width} height={height} fill="url(#grassStripes)" />

          {/* Halfway line on left side */}
          <line x1={50} y1={25} x2={50} y2={625} stroke="#FFFFFF" strokeWidth={4.5} />
          {/* Center Circle D-Arc projecting into the attacking half */}
          <path
            d="M 50 175 A 150 150 0 0 1 50 475"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />
          <circle cx={50} cy={325} r={5} fill="#FFFFFF" />

          {/* Outer Boundary of Attacking Half */}
          <rect
            x={50}
            y={25}
            width={900}
            height={600}
            fill="none"
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth={3.5}
          />

          {/* 18-Yard Box (Penalty Area) */}
          <rect
            x={520}
            y={115}
            width={430}
            height={420}
            fill="rgba(255, 255, 255, 0.05)"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />

          {/* 6-Yard Box */}
          <rect
            x={800}
            y={215}
            width={150}
            height={220}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />

          {/* Penalty Spot */}
          <circle cx={670} cy={325} r={5} fill="#FFFFFF" />

          {/* Penalty D Arc */}
          <path
            d="M 520 225 A 110 110 0 0 0 520 425"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />

          {/* Attacking Goal with White Net on right */}
          <rect
            x={950}
            y={245}
            width={40}
            height={160}
            fill="rgba(255, 255, 255, 0.25)"
            stroke="#FFFFFF"
            strokeWidth={4}
          />
          <line x1={950} y1={245} x2={990} y2={265} stroke="#FFFFFF" strokeWidth={2} />
          <line x1={950} y1={405} x2={990} y2={385} stroke="#FFFFFF" strokeWidth={2} />
          <line x1={990} y1={265} x2={990} y2={385} stroke="#FFFFFF" strokeWidth={2} />

          {/* Right Corner Arcs */}
          <path d="M 915 25 A 35 35 0 0 0 950 60" fill="none" stroke="#FFFFFF" strokeWidth={3} />
          <path d="M 915 625 A 35 35 0 0 1 950 590" fill="none" stroke="#FFFFFF" strokeWidth={3} />

          {/* Tactical Five Corridors overlay across attacking half */}
          <g opacity={0.2}>
            <line x1={50} y1={115} x2={950} y2={115} stroke="#FFFFFF" strokeDasharray="5 7" strokeWidth={2} />
            <line x1={50} y1={215} x2={950} y2={215} stroke="#FFFFFF" strokeDasharray="5 7" strokeWidth={2} />
            <line x1={50} y1={435} x2={950} y2={435} stroke="#FFFFFF" strokeDasharray="5 7" strokeWidth={2} />
            <line x1={50} y1={535} x2={950} y2={535} stroke="#FFFFFF" strokeDasharray="5 7" strokeWidth={2} />
          </g>

          {/* Pitch Badge Watermark */}
          <text x={80} y={65} fill="rgba(255,255,255,0.45)" fontSize="16" fontWeight="bold" letterSpacing="2">
            ATTACKING HALF (FINAL THIRD & BOX ENTRY)
          </text>
        </>
      )}

      {/* ======================= SOCCER: DEFENDING HALF ======================= */}
      {pitchType === "defending_half" && (
        <>
          <rect width={width} height={height} fill="url(#grassStripes)" />

          {/* Halfway line on right side */}
          <line x1={950} y1={25} x2={950} y2={625} stroke="#FFFFFF" strokeWidth={4.5} />
          {/* Center Circle D-Arc projecting into the defending half */}
          <path
            d="M 950 175 A 150 150 0 0 0 950 475"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />
          <circle cx={950} cy={325} r={5} fill="#FFFFFF" />

          {/* Outer Boundary of Defending Half */}
          <rect
            x={50}
            y={25}
            width={900}
            height={600}
            fill="none"
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth={3.5}
          />

          {/* Defending 18-Yard Box */}
          <rect
            x={50}
            y={115}
            width={430}
            height={420}
            fill="rgba(255, 255, 255, 0.05)"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />

          {/* 6-Yard Box */}
          <rect
            x={50}
            y={215}
            width={150}
            height={220}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />

          {/* Penalty Spot */}
          <circle cx={330} cy={325} r={5} fill="#FFFFFF" />

          {/* Penalty D Arc */}
          <path
            d="M 480 225 A 110 110 0 0 1 480 425"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />

          {/* Defending Goal with Net on left */}
          <rect
            x={10}
            y={245}
            width={40}
            height={160}
            fill="rgba(255, 255, 255, 0.25)"
            stroke="#FFFFFF"
            strokeWidth={4}
          />

          {/* Left Corner Arcs */}
          <path d="M 50 60 A 35 35 0 0 0 85 25" fill="none" stroke="#FFFFFF" strokeWidth={3} />
          <path d="M 50 590 A 35 35 0 0 1 85 625" fill="none" stroke="#FFFFFF" strokeWidth={3} />

          {/* Pitch Badge Watermark */}
          <text x={580} y={65} fill="rgba(255,255,255,0.45)" fontSize="16" fontWeight="bold" letterSpacing="2">
            DEFENDING HALF (LOW / MID BLOCK)
          </text>
        </>
      )}

      {/* ======================= SOCCER: 18-YARD PENALTY BOX ======================= */}
      {pitchType === "penalty_box" && (
        <>
          <rect width={width} height={height} fill="url(#grassStripes)" />
          {/* Field Boundary */}
          <rect x={100} y={35} width={850} height={580} fill="none" stroke="#FFFFFF" strokeWidth={3.5} />

          {/* Huge 18-Yard Box filling the center & right */}
          <rect
            x={280}
            y={85}
            width={670}
            height={480}
            fill="rgba(255, 255, 255, 0.06)"
            stroke="#FFFFFF"
            strokeWidth={4}
          />

          {/* 6-Yard Box */}
          <rect
            x={700}
            y={195}
            width={250}
            height={260}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={4}
          />

          {/* Penalty Spot */}
          <circle cx={520} cy={325} r={6} fill="#FFFFFF" />

          {/* Penalty Arc */}
          <path
            d="M 280 205 A 140 140 0 0 0 280 445"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />

          {/* Goal Net on Right */}
          <rect
            x={950}
            y={225}
            width={42}
            height={200}
            fill="rgba(255, 255, 255, 0.25)"
            stroke="#FFFFFF"
            strokeWidth={4.5}
          />

          {/* Pitch Badge Watermark */}
          <text x={120} y={75} fill="rgba(255,255,255,0.45)" fontSize="16" fontWeight="bold" letterSpacing="2">
            18-YARD BOX & SET PIECE FINISHING ZONE
          </text>
        </>
      )}

      {/* ======================= SOCCER: RONDO GRID ======================= */}
      {pitchType === "rondo_grid" && (
        <>
          <rect width={width} height={height} fill="url(#grassStripes)" />
          <rect
            x={150}
            y={100}
            width={700}
            height={450}
            fill="rgba(0, 0, 0, 0.15)"
            stroke="#FFFFFF"
            strokeWidth={3.5}
          />
          <line x1={500} y1={100} x2={500} y2={550} stroke="rgba(255, 255, 255, 0.6)" strokeWidth={2.5} strokeDasharray="6 6" />
          <line x1={150} y1={325} x2={850} y2={325} stroke="rgba(255, 255, 255, 0.6)" strokeWidth={2.5} strokeDasharray="6 6" />
          <circle cx={500} cy={325} r={75} fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth={2.5} />
          <text x={170} y={135} fill="rgba(255,255,255,0.5)" fontSize="15" fontWeight="bold" letterSpacing="1.5">
            DIRECTIONAL RONDO POSSESSION GRID
          </text>
        </>
      )}

      {/* ======================= SOCCER: FULL PITCH ======================= */}
      {pitchType === "full" && (
        <>
          <rect width={width} height={height} fill="url(#grassStripes)" />

          {/* Main pitch border */}
          <rect
            x={25}
            y={25}
            width={950}
            height={600}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />

          {/* Halfway line */}
          <line
            x1={500}
            y1={25}
            x2={500}
            y2={625}
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />

          {/* Center circle */}
          <circle
            cx={500}
            cy={325}
            r={88}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />
          <circle cx={500} cy={325} r={4} fill="#FFFFFF" />

          {/* Left Penalty Box */}
          <rect
            x={25}
            y={150}
            width={160}
            height={350}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />
          {/* Left 6-Yard Box */}
          <rect
            x={25}
            y={235}
            width={55}
            height={180}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />
          <circle cx={135} cy={325} r={4} fill="#FFFFFF" />
          <path
            d="M 185 260 A 88 88 0 0 1 185 390"
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />

          {/* Left Goal Net */}
          <rect x={5} y={275} width={20} height={100} fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" strokeWidth={2.5} />

          {/* Right Penalty Box */}
          <rect
            x={815}
            y={150}
            width={160}
            height={350}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />
          {/* Right 6-Yard Box */}
          <rect
            x={920}
            y={235}
            width={55}
            height={180}
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />
          <circle cx={865} cy={325} r={4} fill="#FFFFFF" />
          <path
            d="M 815 260 A 88 88 0 0 0 815 390"
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={3}
          />

          {/* Right Goal Net */}
          <rect x={975} y={275} width={20} height={100} fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" strokeWidth={2.5} />

          {/* Corner Arcs */}
          <path d="M 25 40 A 15 15 0 0 0 40 25" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth={3} />
          <path d="M 25 610 A 15 15 0 0 1 40 625" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth={3} />
          <path d="M 960 25 A 15 15 0 0 0 975 40" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth={3} />
          <path d="M 960 625 A 15 15 0 0 1 975 610" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth={3} />

          {/* Tactical Five Corridors overlay */}
          <g opacity={0.15}>
            <line x1={25} y1={145} x2={975} y2={145} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
            <line x1={25} y1={235} x2={975} y2={235} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
            <line x1={25} y1={415} x2={975} y2={415} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
            <line x1={25} y1={505} x2={975} y2={505} stroke="#FFFFFF" strokeDasharray="4 6" strokeWidth={1.5} />
          </g>

          <text x={50} y={55} fill="rgba(255,255,255,0.4)" fontSize="13" fontWeight="bold" letterSpacing="2">
            FULL PITCH (105m × 68m)
          </text>
        </>
      )}

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
