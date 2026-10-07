import { mutation } from "./_generated/server.js";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

/**
 * Historical test dates spanning multiple weeks:
 * Aug 14, Aug 21, Aug 28, Sep 04, Sep 11, Sep 18, Sep 25, Oct 02, 2026.
 */
const ASSESSMENT_DATES = [
  "2026-08-14",
  "2026-08-21",
  "2026-08-28",
  "2026-09-04",
  "2026-09-11",
  "2026-09-18",
  "2026-09-25",
  "2026-10-02",
];

interface DrillSpec {
  title: string;
  metric: string;
  unit: string;
  benchmark: number;
  isLowerBetter: boolean;
  baseVal: number;
  deltaPerSession: number;
  category: string;
}

const ALL_PLAYBOOK_DRILL_SPECS: DrillSpec[] = [
  // ==========================================
  // 1. U6-U8 Fundamentals & Ball Mastery
  // ==========================================
  {
    title: "Toe-Tap & Foundation Castle",
    metric: "Toe-Tap & Foundation Castle",
    unit: "touches",
    benchmark: 35,
    isLowerBetter: false,
    baseVal: 28,
    deltaPerSession: 1.9,
    category: "Technical",
  },
  {
    title: "Sharks & Minnows Dribble Escape",
    metric: "Sharks & Minnows Dribble Escape",
    unit: "s",
    benchmark: 45,
    isLowerBetter: false,
    baseVal: 32,
    deltaPerSession: 2.4,
    category: "Agility",
  },
  {
    title: "Pirate Treasure Gate Dribbling",
    metric: "Pirate Treasure Gate Dribbling",
    unit: "gates",
    benchmark: 8,
    isLowerBetter: false,
    baseVal: 5,
    deltaPerSession: 0.65,
    category: "Technical",
  },
  {
    title: "Red Light, Green Light Braking & Acceleration",
    metric: "Red Light, Green Light Braking & Acceleration",
    unit: "s",
    benchmark: 1.2,
    isLowerBetter: true,
    baseVal: 1.55,
    deltaPerSession: -0.045,
    category: "Agility",
  },

  // ==========================================
  // 2. U9-U10 1v1 Skills & Small-Sided Play
  // ==========================================
  {
    title: "Cruyff Turn & Step-Over 1v1 Escape",
    metric: "Cruyff Turn & Step-Over 1v1 Escape",
    unit: "moves",
    benchmark: 12,
    isLowerBetter: false,
    baseVal: 8,
    deltaPerSession: 0.85,
    category: "Technical",
  },
  {
    title: "3v1 Triangle Rondo with Scanning",
    metric: "3v1 Triangle Rondo with Scanning",
    unit: "passes",
    benchmark: 15,
    isLowerBetter: false,
    baseVal: 10,
    deltaPerSession: 1.5,
    category: "Tactical",
  },
  {
    title: "Cone Slalom Dribble & Laces Strike",
    metric: "Cone Slalom Dribble & Laces Strike",
    unit: "pts",
    benchmark: 4,
    isLowerBetter: false,
    baseVal: 2,
    deltaPerSession: 0.35,
    category: "Power",
  },
  {
    title: "Four-Corner Back-Foot Receiving Box",
    metric: "Four-Corner Back-Foot Receiving Box",
    unit: "s",
    benchmark: 22.0,
    isLowerBetter: true,
    baseVal: 26.5,
    deltaPerSession: -0.65,
    category: "Technical",
  },

  // ==========================================
  // 3. U11-U12 Transition & Tactical Shape
  // ==========================================
  {
    title: "4v2 Transition Breakout Rondo",
    metric: "4v2 Transition Breakout Rondo",
    unit: "passes",
    benchmark: 20,
    isLowerBetter: false,
    baseVal: 12,
    deltaPerSession: 1.6,
    category: "Tactical",
  },
  {
    title: "Winger Overlap & Box Finishing Waves",
    metric: "Winger Overlap & Box Finishing Waves",
    unit: "%",
    benchmark: 70,
    isLowerBetter: false,
    baseVal: 52,
    deltaPerSession: 3.8,
    category: "Technical",
  },
  {
    title: "Aerial First Touch & Volley Control",
    metric: "Aerial First Touch & Volley Control",
    unit: "made",
    benchmark: 8,
    isLowerBetter: false,
    baseVal: 5,
    deltaPerSession: 0.55,
    category: "Technical",
  },
  {
    title: "Illinois Soccer Agility & Dribble Test",
    metric: "Illinois Soccer Agility & Dribble Test",
    unit: "s",
    benchmark: 16.5,
    isLowerBetter: true,
    baseVal: 18.4,
    deltaPerSession: -0.26,
    category: "Agility",
  },

  // ==========================================
  // 4. U13-U14 Positional Play & Tactical Roles
  // ==========================================
  {
    title: "5v5+2 Positional Possession with Bumpers",
    metric: "5v5+2 Positional Possession with Bumpers",
    unit: "%",
    benchmark: 65,
    isLowerBetter: false,
    baseVal: 50,
    deltaPerSession: 2.9,
    category: "Tactical",
  },
  {
    title: "High Pressing & Compact Block Triggers",
    metric: "High Pressing & Compact Block Triggers",
    unit: "turnovers",
    benchmark: 5,
    isLowerBetter: false,
    baseVal: 2.5,
    deltaPerSession: 0.55,
    category: "Tactical",
  },
  {
    title: "Midfield Diagonal Switch & Cutback Finish",
    metric: "Midfield Diagonal Switch & Cutback Finish",
    unit: "goals",
    benchmark: 6,
    isLowerBetter: false,
    baseVal: 3,
    deltaPerSession: 0.65,
    category: "Power",
  },
  {
    title: "Rapid Counter-Press (5-Second Swarm)",
    metric: "Rapid Counter-Press (5-Second Swarm)",
    unit: "s",
    benchmark: 4.2,
    isLowerBetter: true,
    baseVal: 5.1,
    deltaPerSession: -0.13,
    category: "Speed",
  },

  // ==========================================
  // 5. U15-U16 Match Tempo, Biomechanics & Positional
  // ==========================================
  {
    title: "7v7+3 Juego de Posición (Positional Mastery)",
    metric: "7v7+3 Juego de Posición (Positional Mastery)",
    unit: "%",
    benchmark: 75,
    isLowerBetter: false,
    baseVal: 58,
    deltaPerSession: 2.8,
    category: "Tactical",
  },
  {
    title: "Gegenpress Wave & Rapid Vertical Counter",
    metric: "Gegenpress Wave & Rapid Vertical Counter",
    unit: "s",
    benchmark: 6.8,
    isLowerBetter: true,
    baseVal: 8.4,
    deltaPerSession: -0.22,
    category: "Speed",
  },
  {
    title: "High-Speed Deceleration & COD Biomechanics Course",
    metric: "High-Speed Deceleration & COD Biomechanics Course",
    unit: "s",
    benchmark: 4.8,
    isLowerBetter: true,
    baseVal: 5.5,
    deltaPerSession: -0.1,
    category: "Agility",
  },
  {
    title: "Goalkeeper Distribution & Sweeper-Keeper Action",
    metric: "Goalkeeper Distribution & Sweeper-Keeper Action",
    unit: "%",
    benchmark: 80,
    isLowerBetter: false,
    baseVal: 62,
    deltaPerSession: 2.6,
    category: "Technical",
  },

  // ==========================================
  // 6. Custom Hercules Academy High-Performance Tests
  // ==========================================
  {
    title: "Flying 30m Laser Velocity Sprint",
    metric: "Flying 30m Laser Velocity Sprint",
    unit: "s",
    benchmark: 4.85,
    isLowerBetter: true,
    baseVal: 5.25,
    deltaPerSession: -0.065,
    category: "Speed",
  },
  {
    title: "Pro Agility 5-10-5 Shuttle Run",
    metric: "Pro Agility 5-10-5 Shuttle Run",
    unit: "s",
    benchmark: 4.65,
    isLowerBetter: true,
    baseVal: 5.08,
    deltaPerSession: -0.068,
    category: "Agility",
  },
  {
    title: "Countermovement Jump (CMJ) Jump Mat",
    metric: "Countermovement Jump (CMJ) Jump Mat",
    unit: "cm",
    benchmark: 56.0,
    isLowerBetter: false,
    baseVal: 48.0,
    deltaPerSession: 1.4,
    category: "Power",
  },
  {
    title: "Yo-Yo Intermittent Recovery Level 1",
    metric: "Yo-Yo Intermittent Recovery Level 1",
    unit: "ml/kg/min",
    benchmark: 55.0,
    isLowerBetter: false,
    baseVal: 46.0,
    deltaPerSession: 1.3,
    category: "Endurance",
  },

  // ==========================================
  // 7. Classic Athletic & Biometric Benchmarks
  // ==========================================
  {
    title: "Sprint 40m (s)",
    metric: "Sprint 40m (s)",
    unit: "s",
    benchmark: 4.6,
    isLowerBetter: true,
    baseVal: 5.68,
    deltaPerSession: -0.055,
    category: "Speed",
  },
  {
    title: "Vertical Jump (cm)",
    metric: "Vertical Jump (cm)",
    unit: "cm",
    benchmark: 65,
    isLowerBetter: false,
    baseVal: 50.0,
    deltaPerSession: 1.9,
    category: "Power",
  },
  {
    title: "Agility T-Test (s)",
    metric: "Agility T-Test (s)",
    unit: "s",
    benchmark: 9.8,
    isLowerBetter: true,
    baseVal: 11.2,
    deltaPerSession: -0.18,
    category: "Agility",
  },
  {
    title: "VO2 Max (ml/kg/min)",
    metric: "VO2 Max (ml/kg/min)",
    unit: "ml/kg/min",
    benchmark: 52.0,
    isLowerBetter: false,
    baseVal: 45.0,
    deltaPerSession: 1.15,
    category: "Endurance",
  },
  {
    title: "Deadlift 1RM (kg)",
    metric: "Deadlift 1RM (kg)",
    unit: "kg",
    benchmark: 140,
    isLowerBetter: false,
    baseVal: 105,
    deltaPerSession: 4.8,
    category: "Strength",
  },
  {
    title: "Beep Test (Level)",
    metric: "Beep Test (Level)",
    unit: "lvl",
    benchmark: 12.0,
    isLowerBetter: false,
    baseVal: 8.5,
    deltaPerSession: 0.45,
    category: "Endurance",
  },
];

export const seedAthleteDrillHistory = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Locate Hercules Sports Academy
    const academy = await ctx.db
      .query("academies")
      .withIndex("by_slug", (q) => q.eq("slug", "hercules-sports"))
      .first();

    if (!academy) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Hercules Sports Academy (slug: hercules-sports) not found",
      });
    }

    const academyId = academy._id;

    // 2. Locate Admin / Coach User
    let admin = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "adminhercules@academieshub.com"))
      .first();

    if (!admin) {
      admin = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", "ah.baalbaki@gmail.com"))
        .first();
    }

    if (!admin) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Admin or coach user not found",
      });
    }

    const adminId = admin._id;
    const nowIso = new Date().toISOString();

    // 3. Locate All Hercules Teams
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();

    const teamMap: Record<string, Id<"teams">> = {};
    for (const t of teams) {
      teamMap[t.name] = t._id;
    }

    const soccerTeamId = teamMap["Elite Academy U16"] || teams[0]._id;
    const soccerYouthTeamId = teamMap["Hercules Youth Football Club U14"] || soccerTeamId;
    const trackSprintTeamId = teamMap["Sprint & Power Squad"] || teams[0]._id;
    const trackVarsityTeamId = teamMap["Varsity Track & Field U18"] || trackSprintTeamId;
    const strengthTeamId = teamMap["High Performance Strength & Conditioning"] || teams[0]._id;

    // 4. Fetch All Athletes in Hercules Academy
    const allAthletes = await ctx.db
      .query("athletes")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();

    // 5. Ensure Every Athlete is in teamMembers
    let teamMembersAdded = 0;
    for (const ath of allAthletes) {
      const existingMember = await ctx.db
        .query("teamMembers")
        .withIndex("by_athlete", (q) => q.eq("athleteId", ath._id))
        .first();

      if (!existingMember) {
        let assignedTeamId = soccerTeamId;
        const s = (ath.sport || "").toLowerCase();
        if (s.includes("track") || s.includes("field") || s.includes("sprint")) {
          assignedTeamId = trackSprintTeamId;
        } else if (s.includes("fitness") || s.includes("strength") || s.includes("crossfit")) {
          assignedTeamId = strengthTeamId;
        } else if (ath.notes?.toLowerCase().includes("u14") || ath.dateOfBirth?.startsWith("2012")) {
          assignedTeamId = soccerYouthTeamId;
        } else {
          assignedTeamId = soccerTeamId;
        }

        await ctx.db.insert("teamMembers", {
          academyId,
          teamId: assignedTeamId,
          athleteId: ath._id,
          createdAt: nowIso,
        });
        teamMembersAdded++;
      }
    }

    // 6. Create Historical Training Sessions across Multiple Dates
    let sessionsAdded = 0;
    const createdSessionIds: Array<{ sessionId: Id<"trainingSessions">; teamId: Id<"teams">; date: string }> = [];

    for (let dIdx = 0; dIdx < ASSESSMENT_DATES.length; dIdx++) {
      const dateStr = ASSESSMENT_DATES[dIdx];
      const sessionStartsAt = `${dateStr}T16:00:00Z`;

      for (const t of teams) {
        const title = `${t.name} – Training & Drill Testing #${dIdx + 1}`;
        const existingSession = await ctx.db
          .query("trainingSessions")
          .withIndex("by_team", (q) => q.eq("teamId", t._id))
          .filter((q) => q.eq(q.field("startsAt"), sessionStartsAt))
          .first();

        let sId: Id<"trainingSessions">;
        if (!existingSession) {
          sId = await ctx.db.insert("trainingSessions", {
            academyId,
            teamId: t._id,
            title,
            startsAt: sessionStartsAt,
            durationMinutes: 90,
            location: t.sport === "Soccer" ? "Pitch A Stadium" : "Main Athletic Track & Gym Alpha",
            notes: `High-performance technical session #${dIdx + 1}. Standardized timing gates and tactical assessment recorded.`,
            createdBy: adminId,
            createdAt: nowIso,
          });
          sessionsAdded++;
        } else {
          sId = existingSession._id;
        }

        createdSessionIds.push({
          sessionId: sId,
          teamId: t._id,
          date: dateStr,
        });
      }
    }

    // 7. Record Attendance for all Team Members on each Session Date
    let attendanceAdded = 0;
    for (const sess of createdSessionIds) {
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", sess.teamId))
        .collect();

      for (let mIdx = 0; mIdx < members.length; mIdx++) {
        const m = members[mIdx];
        const existingAtt = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_session_and_athlete", (q) =>
            q.eq("sessionId", sess.sessionId).eq("athleteId", m.athleteId),
          )
          .first();

        if (!existingAtt) {
          let status: "present" | "late" | "excused" | "absent" = "present";
          // Realistic slight variation (mostly present)
          if ((mIdx + sess.date.length) % 17 === 0) status = "late";
          else if ((mIdx + sess.date.length) % 23 === 0) status = "excused";

          await ctx.db.insert("attendanceRecords", {
            academyId,
            sessionId: sess.sessionId,
            athleteId: m.athleteId,
            status,
            recordedBy: adminId,
            recordedAt: `${sess.date}T16:05:00Z`,
          });
          attendanceAdded++;
        }
      }
    }

    // 8. Enter Assessments across Multiple Dates & Training Drills
    let assessmentsAdded = 0;

    for (let athIdx = 0; athIdx < allAthletes.length; athIdx++) {
      const athlete = allAthletes[athIdx];

      // Seed all 30 drills and benchmarks across the 8 assessment dates
      for (let drillIdx = 0; drillIdx < ALL_PLAYBOOK_DRILL_SPECS.length; drillIdx++) {
        const spec = ALL_PLAYBOOK_DRILL_SPECS[drillIdx];

        // Individualized athlete modifier so athletes have unique authentic performance levels
        const athleteMod = ((athIdx * 7 + drillIdx * 3) % 11) * (spec.isLowerBetter ? -0.02 : 0.04);

        for (let dateIdx = 0; dateIdx < ASSESSMENT_DATES.length; dateIdx++) {
          const assessedOn = ASSESSMENT_DATES[dateIdx];

          // Compute progressive curve with slight session-to-session variation
          const sessionNoise = ((dateIdx * 13 + athIdx * 5) % 5 - 2) * 0.01;
          const rawScore =
            spec.baseVal +
            dateIdx * spec.deltaPerSession +
            athleteMod * spec.baseVal +
            sessionNoise * spec.baseVal;

          const value =
            spec.unit === "s" || spec.unit === "ml/kg/min"
              ? Math.round(rawScore * 100) / 100
              : spec.unit === "%" || spec.unit === "touches" || spec.unit === "cm" || spec.unit === "kg"
                ? Math.round(rawScore * 10) / 10
                : Math.max(1, Math.round(rawScore));

          // Check if already exists
          const existing = await ctx.db
            .query("assessments")
            .withIndex("by_athlete_and_metric", (q) =>
              q.eq("athleteId", athlete._id).eq("metric", spec.metric),
            )
            .filter((q) => q.eq(q.field("assessedOn"), assessedOn))
            .first();

          if (!existing) {
            const noteCues = [
              "Baseline testing session",
              "Improved body angle and acceleration posture",
              "Rapid hip transition on direction change",
              "Solid technical control under defensive pressure",
              "Clean laser gate exit speed",
              "High power-to-cadence ratio maintained",
              "Peak velocity personal best established",
              "Excellent consistency across repeated intervals",
            ];
            const note = noteCues[dateIdx % noteCues.length];

            await ctx.db.insert("assessments", {
              academyId,
              athleteId: athlete._id,
              metric: spec.metric,
              value,
              unit: spec.unit,
              assessedOn,
              notes: `${note} – Session #${dateIdx + 1}`,
              createdBy: adminId,
              createdAt: nowIso,
            });
            assessmentsAdded++;
          }
        }
      }
    }

    return {
      success: true,
      academyName: academy.name,
      totalAthletes: allAthletes.length,
      teamMembersAdded,
      sessionsAdded,
      attendanceAdded,
      assessmentsAdded,
      testDatesCount: ASSESSMENT_DATES.length,
      drillsPerAthlete: ALL_PLAYBOOK_DRILL_SPECS.length,
    };
  },
});
