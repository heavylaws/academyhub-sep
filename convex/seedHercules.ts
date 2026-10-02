import { mutation } from "./_generated/server.js";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const seedHerculesStatistics = mutation({
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

    // 2. Identify Admin User
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
        message: "No admin user found to attribute Hercules seed data to",
      });
    }

    const adminId = admin._id;
    const now = new Date("2026-10-02T14:00:00Z");
    const nowIso = now.toISOString();
    const dayMs = 24 * 60 * 60 * 1000;

    // 3. Teams Setup
    const existingTeams = await ctx.db
      .query("teams")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();

    const teamsMap = new Map<string, Id<"teams">>();
    for (const t of existingTeams) {
      teamsMap.set(t.name, t._id);
    }

    const desiredTeams = [
      { name: "Sprint & Power Squad", sport: "Track & Field" },
      { name: "Elite Academy U16", sport: "Soccer" },
      { name: "Varsity Track & Field U18", sport: "Track & Field" },
      { name: "Hercules Youth Football Club U14", sport: "Soccer" },
      { name: "High Performance Strength & Conditioning", sport: "Fitness" },
    ];

    for (const dt of desiredTeams) {
      if (!teamsMap.has(dt.name)) {
        const tid = await ctx.db.insert("teams", {
          academyId,
          name: dt.name,
          sport: dt.sport,
          createdBy: adminId,
          createdAt: nowIso,
        });
        teamsMap.set(dt.name, tid);
      }
    }

    const track1TeamId = teamsMap.get("Sprint & Power Squad")!;
    const soccer1TeamId = teamsMap.get("Elite Academy U16")!;
    const trackVarsityTeamId = teamsMap.get("Varsity Track & Field U18")!;
    const soccerYouthTeamId = teamsMap.get("Hercules Youth Football Club U14")!;
    const strengthTeamId = teamsMap.get("High Performance Strength & Conditioning")!;

    // 4. Athletes Setup
    const existingAthletes = await ctx.db
      .query("athletes")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();

    const athleteEmailMap = new Map<string, Id<"athletes">>();
    for (const ath of existingAthletes) {
      if (ath.email) athleteEmailMap.set(ath.email.toLowerCase(), ath._id);
    }

    const additionalAthletes = [
      {
        firstName: "Karim",
        lastName: "Haddad",
        email: "karim.haddad@athlete.hercules.test",
        gender: "male" as const,
        sport: "Track & Field",
        dateOfBirth: "2009-04-12",
        heightCm: 182,
        weightKg: 73,
        phone: "+961 70 881 102",
        notes: "Long jump & triple jump specialist. High power-to-weight ratio.",
        guardianName: "Walid Haddad",
        guardianEmail: "walid.haddad@family.test",
        checkInPin: "1004",
        teamId: trackVarsityTeamId,
      },
      {
        firstName: "Nour",
        lastName: "Zein",
        email: "nour.zein@athlete.hercules.test",
        gender: "female" as const,
        sport: "Track & Field",
        dateOfBirth: "2010-08-23",
        heightCm: 168,
        weightKg: 54,
        phone: "+961 71 334 901",
        notes: "Middle distance 800m/1500m runner. Exceptional aerobic endurance.",
        guardianName: "Hala Zein",
        guardianEmail: "hala.zein@family.test",
        checkInPin: "1005",
        teamId: trackVarsityTeamId,
      },
      {
        firstName: "Tarek",
        lastName: "Bazzi",
        email: "tarek.bazzi@athlete.hercules.test",
        gender: "male" as const,
        sport: "Track & Field",
        dateOfBirth: "2009-11-05",
        heightCm: 185,
        weightKg: 78,
        phone: "+961 76 552 119",
        notes: "Decathlon candidate. Fast hurdles and explosive pole vault mechanics.",
        guardianName: "Bilal Bazzi",
        guardianEmail: "bilal.bazzi@family.test",
        checkInPin: "1006",
        teamId: trackVarsityTeamId,
      },
      {
        firstName: "Maya",
        lastName: "Sfeir",
        email: "maya.sfeir@athlete.hercules.test",
        gender: "female" as const,
        sport: "Track & Field",
        dateOfBirth: "2011-02-17",
        heightCm: 163,
        weightKg: 50,
        phone: "+961 70 914 203",
        notes: "High jumper with natural rhythm and rotational elasticity.",
        guardianName: "Carla Sfeir",
        guardianEmail: "carla.sfeir@family.test",
        checkInPin: "1007",
        teamId: track1TeamId,
      },
      {
        firstName: "Lucas",
        lastName: "Mendes",
        email: "lucas.mendes@athlete.hercules.test",
        gender: "male" as const,
        sport: "Soccer",
        dateOfBirth: "2010-06-29",
        heightCm: 181,
        weightKg: 72,
        phone: "+961 71 405 882",
        notes: "Dominant centre-back with strong aerial duels and leadership.",
        guardianName: "Ricardo Mendes",
        guardianEmail: "ricardo.mendes@family.test",
        checkInPin: "2004",
        teamId: soccer1TeamId,
      },
      {
        firstName: "Ziad",
        lastName: "Salameh",
        email: "ziad.salameh@athlete.hercules.test",
        gender: "male" as const,
        sport: "Soccer",
        dateOfBirth: "2009-09-15",
        heightCm: 188,
        weightKg: 80,
        phone: "+961 76 103 449",
        notes: "First-choice goalkeeper; rapid reflex saves and high distribution accuracy.",
        guardianName: "Ghassan Salameh",
        guardianEmail: "ghassan.salameh@family.test",
        checkInPin: "2005",
        teamId: soccer1TeamId,
      },
      {
        firstName: "Chloe",
        lastName: "Dubois",
        email: "chloe.dubois@athlete.hercules.test",
        gender: "female" as const,
        sport: "Soccer",
        dateOfBirth: "2012-05-19",
        heightCm: 159,
        weightKg: 48,
        phone: "+961 70 663 812",
        notes: "Playmaking central midfielder. High press resistance and quick scanning.",
        guardianName: "Jean Dubois",
        guardianEmail: "jean.dubois@family.test",
        checkInPin: "2006",
        teamId: soccerYouthTeamId,
      },
      {
        firstName: "Jad",
        lastName: "Mansour",
        email: "jad.mansour@athlete.hercules.test",
        gender: "male" as const,
        sport: "Soccer",
        dateOfBirth: "2012-10-08",
        heightCm: 161,
        weightKg: 51,
        phone: "+961 71 823 904",
        notes: "Clinical poacher; fast off-the-ball movements inside the 18-yard box.",
        guardianName: "Fadi Mansour",
        guardianEmail: "fadi.mansour@family.test",
        checkInPin: "2007",
        teamId: soccerYouthTeamId,
      },
      {
        firstName: "Adam",
        lastName: "Corm",
        email: "adam.corm@athlete.hercules.test",
        gender: "male" as const,
        sport: "Fitness",
        dateOfBirth: "2008-12-11",
        heightCm: 179,
        weightKg: 77,
        phone: "+961 70 412 855",
        notes: "Olympic lifting & hypertrophy protocol. Peak power clean technique.",
        guardianName: "Ziad Corm",
        guardianEmail: "ziad.corm@family.test",
        checkInPin: "3001",
        teamId: strengthTeamId,
      },
      {
        firstName: "Lea",
        lastName: "Maalouf",
        email: "lea.maalouf@athlete.hercules.test",
        gender: "female" as const,
        sport: "Fitness",
        dateOfBirth: "2009-07-30",
        heightCm: 172,
        weightKg: 62,
        phone: "+961 71 991 432",
        notes: "Hybrid athlete focusing on plyometric vertical leaps and core torque.",
        guardianName: "Maya Maalouf",
        guardianEmail: "maya.maalouf@family.test",
        checkInPin: "3002",
        teamId: strengthTeamId,
      },
      {
        firstName: "Sami",
        lastName: "Fakhry",
        email: "sami.fakhry@athlete.hercules.test",
        gender: "male" as const,
        sport: "Fitness",
        dateOfBirth: "2010-01-25",
        heightCm: 174,
        weightKg: 66,
        phone: "+961 76 774 219",
        notes: "Speed ladder & change of direction agility leader.",
        guardianName: "Nabil Fakhry",
        guardianEmail: "nabil.fakhry@family.test",
        checkInPin: "3003",
        teamId: strengthTeamId,
      },
      {
        firstName: "Zeina",
        lastName: "Kassir",
        email: "zeina.kassir@athlete.hercules.test",
        gender: "female" as const,
        sport: "Track & Field",
        dateOfBirth: "2011-04-18",
        heightCm: 166,
        weightKg: 53,
        phone: "+961 70 519 320",
        notes: "Sprint hurdles candidate. Rapid cadence through transition markers.",
        guardianName: "Layla Kassir",
        guardianEmail: "layla.kassir@family.test",
        checkInPin: "1008",
        teamId: track1TeamId,
      },
    ];

    let newAthletesCount = 0;
    for (const a of additionalAthletes) {
      if (!athleteEmailMap.has(a.email.toLowerCase())) {
        const athId = await ctx.db.insert("athletes", {
          academyId,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          gender: a.gender,
          sport: a.sport,
          dateOfBirth: a.dateOfBirth,
          heightCm: a.heightCm,
          weightKg: a.weightKg,
          phone: a.phone,
          notes: a.notes,
          guardianName: a.guardianName,
          guardianEmail: a.guardianEmail,
          status: "active",
          checkInPin: a.checkInPin,
          createdBy: adminId,
          createdAt: nowIso,
        });

        // Insert team membership
        await ctx.db.insert("teamMembers", {
          academyId,
          teamId: a.teamId,
          athleteId: athId,
          createdAt: nowIso,
        });

        athleteEmailMap.set(a.email.toLowerCase(), athId);
        newAthletesCount++;
      }
    }

    // Refresh all athletes for Hercules Academy
    const allAthletes = await ctx.db
      .query("athletes")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();

    // 5. Training Sessions (Time series: 4 weeks past to 2 weeks future)
    const sessionSpecs = [
      {
        teamId: track1TeamId,
        title: "Sprint Acceleration & Block Clearance",
        offsetDays: -28,
        duration: 90,
        location: "Main Track - Lane 1-4",
        notes: "Drive phase posture and 10m laser timing gates.",
      },
      {
        teamId: soccer1TeamId,
        title: "High-Pressing Triggers & Counter-Attacks",
        offsetDays: -26,
        duration: 90,
        location: "Pitch A - North Stadium",
        notes: "Small-sided 4v4+3 positional games.",
      },
      {
        teamId: trackVarsityTeamId,
        title: "Max Velocity Mechanics & Fly-Ins",
        offsetDays: -21,
        duration: 90,
        location: "Main Track - Backstraight",
        notes: "30m fly-in with photoelectric timing gates.",
      },
      {
        teamId: strengthTeamId,
        title: "Posterior Chain Power & Trap Bar Jumps",
        offsetDays: -18,
        duration: 75,
        location: "Performance Weight Room Alpha",
        notes: "Velocity based training with accelerometer sensors.",
      },
      {
        teamId: soccerYouthTeamId,
        title: "First Touch Under Pressure & 1v1 Escapes",
        offsetDays: -14,
        duration: 75,
        location: "Pitch B - Artificial Turf",
        notes: "Receiving on the half-turn with passive defenders.",
      },
      {
        teamId: track1TeamId,
        title: "Lactic Acid Tolerance & Curve Sprinting",
        offsetDays: -10,
        duration: 90,
        location: "Main Track - Turn 2",
        notes: "150m repeats at 92% maximum velocity.",
      },
      {
        teamId: soccer1TeamId,
        title: "Defensive Line Synchronization & Offside Trap",
        offsetDays: -7,
        duration: 90,
        location: "Pitch A - Main Stadium",
        notes: "11v11 shadow play focusing on zonal shift.",
      },
      {
        teamId: trackVarsityTeamId,
        title: "Jumps Runway Rhythm & Penultimate Step Mechanics",
        offsetDays: -4,
        duration: 90,
        location: "Jumps Pit & Runway",
        notes: "Focus on takeoff angle and tall hip displacement.",
      },
      {
        teamId: strengthTeamId,
        title: "Full Body Explosive Contrast Training",
        offsetDays: -2,
        duration: 75,
        location: "Performance Weight Room Alpha",
        notes: "Heavy squats paired with unweighted box jumps.",
      },
      {
        teamId: track1TeamId,
        title: "Championship Qualifying Simulation",
        offsetDays: -1,
        duration: 90,
        location: "Main Track",
        notes: "Full competition warm-up, marshalling and timed heats.",
      },
      // Upcoming Sessions
      {
        teamId: track1TeamId,
        title: "Plyometric Bounds & Reactive Agility",
        offsetDays: 1,
        duration: 90,
        location: "Main Track & Infield",
        notes: "Bring resistance hurdles and spikes.",
      },
      {
        teamId: soccer1TeamId,
        title: "Set Piece Routines & Penalty Scenarios",
        offsetDays: 3,
        duration: 90,
        location: "Pitch A - North Stadium",
        notes: "Inswinging and outswinging corner kicks.",
      },
      {
        teamId: trackVarsityTeamId,
        title: "Endurance Pacing & Aerobic Capacity 800m",
        offsetDays: 5,
        duration: 90,
        location: "Main Track",
        notes: "Split time monitoring every 200m.",
      },
      {
        teamId: strengthTeamId,
        title: "Rotational Core Power & Medicine Ball Slams",
        offsetDays: 7,
        duration: 75,
        location: "Indoor Turf Hall",
        notes: "High rotational velocity medicine ball throws.",
      },
      {
        teamId: soccerYouthTeamId,
        title: "Fast Break Transitions & 3v2 Overloads",
        offsetDays: 10,
        duration: 90,
        location: "Pitch B - Artificial Turf",
        notes: "Quick decision making inside final third.",
      },
    ];

    let createdSessionsCount = 0;
    const pastSessionDocs: Array<{ id: Id<"trainingSessions">; teamId: Id<"teams">; date: string }> = [];

    for (const spec of sessionSpecs) {
      const sessionDate = new Date(now.getTime() + spec.offsetDays * dayMs).toISOString();

      // Check if session with this title and date exists
      const existingSession = await ctx.db
        .query("trainingSessions")
        .withIndex("by_team", (q) => q.eq("teamId", spec.teamId))
        .filter((q) => q.eq(q.field("title"), spec.title))
        .first();

      let sessionId: Id<"trainingSessions">;
      if (!existingSession) {
        sessionId = await ctx.db.insert("trainingSessions", {
          academyId,
          teamId: spec.teamId,
          title: spec.title,
          startsAt: sessionDate,
          durationMinutes: spec.duration,
          location: spec.location,
          notes: spec.notes,
          createdBy: adminId,
          createdAt: nowIso,
        });
        createdSessionsCount++;
      } else {
        sessionId = existingSession._id;
      }

      if (spec.offsetDays < 0) {
        pastSessionDocs.push({ id: sessionId, teamId: spec.teamId, date: sessionDate });
      }
    }

    // 6. Attendance Records for past sessions
    let attendanceCount = 0;
    for (const sess of pastSessionDocs) {
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", sess.teamId))
        .collect();

      for (let idx = 0; idx < members.length; idx++) {
        const m = members[idx];
        const existingRecord = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_session_and_athlete", (q) =>
            q.eq("sessionId", sess.id).eq("athleteId", m.athleteId),
          )
          .first();

        if (!existingRecord) {
          // Realistic attendance distribution
          let status: "present" | "late" | "absent" | "excused" = "present";
          if (idx % 8 === 0) status = "late";
          else if (idx % 13 === 0) status = "excused";
          else if (idx % 17 === 0) status = "absent";

          await ctx.db.insert("attendanceRecords", {
            academyId,
            sessionId: sess.id,
            athleteId: m.athleteId,
            status,
            recordedBy: adminId,
            recordedAt: sess.date,
          });
          attendanceCount++;
        }
      }
    }

    // 7. Assessments (Multi-week progression data for statistics charts)
    const benchmarkSeries = [
      {
        metric: "Sprint 40m (s)",
        unit: "s",
        weeks: [-28, -14, -2],
        baseGen: (i: number) => 5.65 - (i % 6) * 0.08,
        delta: -0.06, // improving speed
      },
      {
        metric: "Vertical Jump (cm)",
        unit: "cm",
        weeks: [-28, -14, -2],
        baseGen: (i: number) => 46.0 + (i % 7) * 2.5,
        delta: 1.8, // improving jump
      },
      {
        metric: "Agility T-Test (s)",
        unit: "s",
        weeks: [-28, -14, -2],
        baseGen: (i: number) => 11.2 - (i % 5) * 0.18,
        delta: -0.15, // improving agility
      },
      {
        metric: "VO2 Max (ml/kg/min)",
        unit: "ml/kg/min",
        weeks: [-28, -14, -2],
        baseGen: (i: number) => 47.0 + (i % 8) * 1.5,
        delta: 1.2, // improving aerobic capacity
      },
      {
        metric: "Beep Test (Level)",
        unit: "lvl",
        weeks: [-28, -14, -2],
        baseGen: (i: number) => 9.5 + (i % 6) * 0.6,
        delta: 0.5, // improving endurance
      },
      {
        metric: "Deadlift 1RM (kg)",
        unit: "kg",
        weeks: [-28, -14, -2],
        baseGen: (i: number) => 100 + (i % 7) * 7.5,
        delta: 5.0, // improving strength
      },
    ];

    let createdAssessments = 0;
    for (const b of benchmarkSeries) {
      for (let wIdx = 0; wIdx < b.weeks.length; wIdx++) {
        const weekOffset = b.weeks[wIdx];
        const assessedOn = new Date(now.getTime() + weekOffset * dayMs)
          .toISOString()
          .slice(0, 10);

        for (let i = 0; i < allAthletes.length; i++) {
          const ath = allAthletes[i];
          const rawVal = b.baseGen(i) + wIdx * b.delta;
          const roundedVal = Math.round(rawVal * 100) / 100;

          // Check existing assessment
          const existingAss = await ctx.db
            .query("assessments")
            .withIndex("by_athlete_and_metric", (q) =>
              q.eq("athleteId", ath._id).eq("metric", b.metric),
            )
            .filter((q) => q.eq(q.field("assessedOn"), assessedOn))
            .first();

          if (!existingAss) {
            await ctx.db.insert("assessments", {
              academyId,
              athleteId: ath._id,
              metric: b.metric,
              value: roundedVal,
              unit: b.unit,
              assessedOn,
              notes: wIdx === 0 ? "Baseline assessment" : `Week ${wIdx * 2} Progress check`,
              createdBy: adminId,
              createdAt: nowIso,
            });
            createdAssessments++;
          }
        }
      }
    }

    // 8. Custom Drills
    const drillTemplates = [
      {
        title: "Flying 30m Laser Velocity Sprint",
        ageGroup: "U16-U20",
        birthYears: "2006-2011",
        category: "speed",
        categoryLabel: "Maximum Speed",
        difficulty: "Advanced",
        durationMinutes: 25,
        recommendedSets: 4,
        recommendedReps: 2,
        gridDimensions: "60m Runway",
        equipment: ["Photoelectric Timing Gates", "Cones", "Spikes"],
        summary: "Measures pure maximum velocity with a 20m acceleration zone and 30m flying timing window.",
        setup: "Place first timing gate at 20m and exit gate at 50m.",
        instructions: [
          "Athlete accelerates smoothly over first 20m without straining.",
          "Hit absolute top gear as you pass the first beam.",
          "Maintain tall upright sprint mechanics through the finish gate.",
        ],
        coachingPoints: [
          "Dorsiflex ankles before foot strike.",
          "Strike directly beneath centre of mass.",
          "Keep shoulders relaxed with relaxed facial muscles.",
        ],
        metricName: "Sprint 40m (s)",
        metricUnit: "s",
        benchmark: 4.85,
        isLowerBetter: true,
        targetAttribute: "Top Velocity",
      },
      {
        title: "Pro Agility 5-10-5 Shuttle Run",
        ageGroup: "U14-U18",
        birthYears: "2008-2012",
        category: "agility",
        categoryLabel: "Change of Direction",
        difficulty: "Intermediate",
        durationMinutes: 20,
        recommendedSets: 3,
        recommendedReps: 3,
        gridDimensions: "10 Yards Width",
        equipment: ["3 Cones", "Stopwatch"],
        summary: "Tests lateral change of direction and deceleration balance.",
        setup: "Place 3 cones 5 yards apart in a straight line.",
        instructions: [
          "Start in three-point stance straddling the middle cone.",
          "Sprint 5 yards to the right cone, touch line with right hand.",
          "Pivot and sprint 10 yards to far left cone, touch line with left hand.",
          "Sprint through the center line.",
        ],
        coachingPoints: [
          "Drop hips low when braking.",
          "Push violently off the outside foot.",
          "Keep eyes up during direction shift.",
        ],
        metricName: "Agility T-Test (s)",
        metricUnit: "s",
        benchmark: 4.65,
        isLowerBetter: true,
        targetAttribute: "Lateral Agility",
      },
      {
        title: "Countermovement Jump (CMJ) Jump Mat",
        ageGroup: "All Ages",
        birthYears: "All",
        category: "power",
        categoryLabel: "Explosive Lower Body Power",
        difficulty: "Intermediate",
        durationMinutes: 15,
        recommendedSets: 3,
        recommendedReps: 3,
        gridDimensions: "Jump Mat Area",
        equipment: ["Electronic Contact Jump Mat", "Measuring Tape"],
        summary: "Assesses neuromuscular readiness and lower-body stretch-shortening cycle efficiency.",
        setup: "Stand centered on jump mat with hands on hips.",
        instructions: [
          "Dip rapidly into a quarter squat.",
          "Explode vertically with maximum intent.",
          "Land on the mat with soft knees in the same spot.",
        ],
        coachingPoints: [
          "Hands must stay fixed on iliac crest.",
          "Zero heel slippage upon takeoff.",
          "Land softly without excessive forward trunk lean.",
        ],
        metricName: "Vertical Jump (cm)",
        metricUnit: "cm",
        benchmark: 56.0,
        isLowerBetter: false,
        targetAttribute: "Explosive Power",
      },
      {
        title: "Yo-Yo Intermittent Recovery Level 1",
        ageGroup: "U14-Senior",
        birthYears: "2005-2012",
        category: "endurance",
        categoryLabel: "Aerobic Capacity",
        difficulty: "Advanced",
        durationMinutes: 30,
        recommendedSets: 1,
        recommendedReps: 1,
        gridDimensions: "25m Running Lane",
        equipment: ["Yo-Yo Audio Track", "Cones", "Recording Sheets"],
        summary: "Standardized soccer and athletic intermittent endurance benchmark.",
        setup: "Mark a 20m running shuttle and a 5m active recovery zone behind the start.",
        instructions: [
          "Run 2 x 20m shuttle upon the acoustic signal.",
          "Jog 5m into the recovery area for 10 seconds between shuttles.",
          "Continue until failure to maintain pace twice.",
        ],
        coachingPoints: [
          "Turn sharply at the 20m line.",
          "Breathe deeply during the 10-second jog recovery.",
        ],
        metricName: "VO2 Max (ml/kg/min)",
        metricUnit: "ml/kg/min",
        benchmark: 55.0,
        isLowerBetter: false,
        targetAttribute: "Aerobic Endurance",
      },
    ];

    let createdDrills = 0;
    for (const d of drillTemplates) {
      const existingDrill = await ctx.db
        .query("drills")
        .withIndex("by_academy", (q) => q.eq("academyId", academyId))
        .filter((q) => q.eq(q.field("title"), d.title))
        .first();

      if (!existingDrill) {
        await ctx.db.insert("drills", {
          academyId,
          title: d.title,
          ageGroup: d.ageGroup,
          birthYears: d.birthYears,
          category: d.category,
          categoryLabel: d.categoryLabel,
          difficulty: d.difficulty,
          durationMinutes: d.durationMinutes,
          recommendedSets: d.recommendedSets,
          recommendedReps: d.recommendedReps,
          gridDimensions: d.gridDimensions,
          equipment: d.equipment,
          summary: d.summary,
          setup: d.setup,
          instructions: d.instructions,
          coachingPoints: d.coachingPoints,
          metricName: d.metricName,
          metricUnit: d.metricUnit,
          benchmark: d.benchmark,
          isLowerBetter: d.isLowerBetter,
          targetAttribute: d.targetAttribute,
          createdBy: adminId,
          createdByName: admin.name ?? "Head Coach",
          createdByRole: admin.role ?? "academy_admin",
          createdAt: nowIso,
        });
        createdDrills++;
      }
    }

    // 9. Training Plans & Plan Items
    const planSpecs: Array<{
      athleteIdx: number;
      title: string;
      description: string;
      status: "active" | "completed" | "archived";
      items: Array<{
        name: string;
        sets?: number;
        reps?: number;
        durationSeconds?: number;
        notes?: string;
      }>;
    }> = [
      {
        athleteIdx: 0,
        title: "Sprint Acceleration & Block Clearance Protocol",
        description: "6-week progressive microcycle targeting explosive initial step frequency.",
        status: "active" as const,
        items: [
          { name: "Wall March Drills", sets: 3, reps: 10, notes: "Strict 45-degree angle" },
          { name: "Sled Pushes (50% bodyweight)", sets: 4, durationSeconds: 20, notes: "Low hip position" },
          { name: "Block Starts 30m with laser timing", sets: 5, reps: 1, notes: "Sub-4.0s target" },
          { name: "Overhead Med Ball Back Throws", sets: 4, reps: 5, notes: "Maximum triple extension" },
        ],
      },
      {
        athleteIdx: 1,
        title: "Aerobic Capacity & 800m Pacing Optimization",
        description: "Targeting sustained high-tempo threshold and cadence management.",
        status: "active" as const,
        items: [
          { name: "Dynamic Warmup & Hurdle Mobility", durationSeconds: 600, notes: "Full range of motion" },
          { name: "400m Broken Intervals (60s rest)", sets: 6, reps: 1, notes: "62s pace per lap" },
          { name: "Core & Isometric Pillar Holds", sets: 3, durationSeconds: 45, notes: "Maintain neutral spine" },
        ],
      },
      {
        athleteIdx: 3,
        title: "In-Season Soccer High-Intensity Conditioning",
        description: "Focus on rapid recovery between counter-pressing transitions.",
        status: "active" as const,
        items: [
          { name: "Shuttle Runs 10-20-30m", sets: 5, durationSeconds: 30, notes: "Quick foot plant" },
          { name: "Box-to-Box Recovery Runs", sets: 4, reps: 2, notes: "Active jog on return" },
          { name: "Hexagon Agility Jumps", sets: 4, durationSeconds: 20, notes: "Fast reactive bounce" },
        ],
      },
      {
        athleteIdx: 4,
        title: "Lower Body Explosive Power & Triple Extension",
        description: "Off-season hypertrophy to power phase translation.",
        status: "completed" as const,
        items: [
          { name: "Trap Bar Deadlifts", sets: 4, reps: 6, notes: "80% 1RM controlled tempo" },
          { name: "Depth Jumps (45cm box)", sets: 4, reps: 4, notes: "Minimise ground contact time" },
          { name: "Kettlebell Swings (28kg)", sets: 3, reps: 15, notes: "Snappy hip snap" },
        ],
      },
    ];

    let createdPlans = 0;
    for (const ps of planSpecs) {
      if (ps.athleteIdx < allAthletes.length) {
        const ath = allAthletes[ps.athleteIdx];
        const existingPlan = await ctx.db
          .query("trainingPlans")
          .withIndex("by_athlete", (q) => q.eq("athleteId", ath._id))
          .filter((q) => q.eq(q.field("title"), ps.title))
          .first();

        if (!existingPlan) {
          const planId = await ctx.db.insert("trainingPlans", {
            academyId,
            athleteId: ath._id,
            title: ps.title,
            description: ps.description,
            status: ps.status,
            startDate: new Date(now.getTime() - 21 * dayMs).toISOString().slice(0, 10),
            endDate: new Date(now.getTime() + 21 * dayMs).toISOString().slice(0, 10),
            createdBy: adminId,
            createdAt: nowIso,
          });

          for (let o = 0; o < ps.items.length; o++) {
            const item = ps.items[o];
            await ctx.db.insert("planItems", {
              planId,
              academyId,
              order: o,
              name: item.name,
              sets: item.sets,
              reps: item.reps,
              durationSeconds: item.durationSeconds,
              notes: item.notes,
              result: ps.status === "completed" ? "Successfully completed target" : undefined,
              completedAt: ps.status === "completed" ? nowIso : undefined,
              completedBy: ps.status === "completed" ? adminId : undefined,
            });
          }
          createdPlans++;
        }
      }
    }

    // 10. Financial Data (Fee Schedules, Athlete Fees, Payments, Invoices)
    const feeSpecList = [
      { athIdx: 0, label: "Monthly Membership – September 2026", amount: 150, status: "paid" as const, dueOffset: -25, paid: true },
      { athIdx: 0, label: "Monthly Membership – October 2026", amount: 150, status: "paid" as const, dueOffset: 5, paid: true },
      { athIdx: 1, label: "Monthly Membership – September 2026", amount: 150, status: "paid" as const, dueOffset: -25, paid: true },
      { athIdx: 1, label: "Monthly Membership – October 2026", amount: 150, status: "unpaid" as const, dueOffset: 5, paid: false },
      { athIdx: 2, label: "Track Team Fee – September 2026", amount: 180, status: "paid" as const, dueOffset: -25, paid: true },
      { athIdx: 2, label: "Track Team Fee – October 2026", amount: 180, status: "partially_paid" as const, dueOffset: 5, paid: false, partialAmount: 100 },
      { athIdx: 3, label: "Soccer Academy Fee – September 2026", amount: 200, status: "paid" as const, dueOffset: -25, paid: true },
      { athIdx: 3, label: "Soccer Academy Fee – October 2026", amount: 200, status: "paid" as const, dueOffset: 5, paid: true },
      { athIdx: 4, label: "Youth League Registration – Fall 2026", amount: 120, status: "paid" as const, dueOffset: -15, paid: true },
      { athIdx: 5, label: "Monthly Membership – September 2026", amount: 150, status: "overdue" as const, dueOffset: -10, paid: false },
      { athIdx: 6, label: "Monthly Membership – October 2026", amount: 150, status: "unpaid" as const, dueOffset: 8, paid: false },
      { athIdx: 7, label: "Elite Performance Training – October 2026", amount: 250, status: "paid" as const, dueOffset: 2, paid: true },
    ];

    let createdFees = 0;
    let createdPayments = 0;

    for (const f of feeSpecList) {
      if (f.athIdx < allAthletes.length) {
        const ath = allAthletes[f.athIdx];
        const dueDate = new Date(now.getTime() + f.dueOffset * dayMs).toISOString().slice(0, 10);

        const existingFee = await ctx.db
          .query("athleteFees")
          .withIndex("by_athlete", (q) => q.eq("athleteId", ath._id))
          .filter((q) => q.eq(q.field("label"), f.label))
          .first();

        let feeId: Id<"athleteFees">;
        if (!existingFee) {
          feeId = await ctx.db.insert("athleteFees", {
            academyId,
            athleteId: ath._id,
            label: f.label,
            amountDue: f.amount,
            currency: "USD",
            dueDate,
            status: f.status,
            notes: "Official academy season billing",
            createdBy: adminId,
            createdAt: nowIso,
          });
          createdFees++;

          if (f.paid) {
            await ctx.db.insert("feePayments", {
              feeId,
              athleteId: ath._id,
              academyId,
              amountPaid: f.amount,
              currency: "USD",
              paidOn: dueDate,
              method: f.athIdx % 2 === 0 ? "Bank Transfer" : "Credit Card",
              note: "Payment settled on time",
              recordedBy: adminId,
              recordedAt: nowIso,
            });
            createdPayments++;
          } else if (f.partialAmount) {
            await ctx.db.insert("feePayments", {
              feeId,
              athleteId: ath._id,
              academyId,
              amountPaid: f.partialAmount,
              currency: "USD",
              paidOn: dueDate,
              method: "Cash",
              note: "Partial payment received",
              recordedBy: adminId,
              recordedAt: nowIso,
            });
            createdPayments++;
          }
        }
      }
    }

    // Invoices
    const invoiceSpecs = [
      { num: "INV-101", desc: "Monthly Academy Membership - Sep 2026", amount: 150, status: "paid" as const, offsetDays: -20 },
      { num: "INV-102", desc: "Elite Track & Field Training Kit", amount: 180, status: "paid" as const, offsetDays: -18 },
      { num: "INV-103", desc: "Monthly Academy Membership - Sep 2026", amount: 150, status: "paid" as const, offsetDays: -15 },
      { num: "INV-104", desc: "Soccer Team League Entry Fee", amount: 320, status: "paid" as const, offsetDays: -10 },
      { num: "INV-105", desc: "Monthly Academy Membership - Oct 2026", amount: 150, status: "sent" as const, offsetDays: 5 },
      { num: "INV-106", desc: "Biomechanics Video Analysis Package", amount: 200, status: "paid" as const, offsetDays: -5 },
      { num: "INV-107", desc: "Strength & Conditioning Lab Access", amount: 175, status: "sent" as const, offsetDays: 10 },
      { num: "INV-108", desc: "Late Season Tournament Jersey & Travel", amount: 260, status: "overdue" as const, offsetDays: -4 },
    ];

    let createdInvoices = 0;
    for (let idx = 0; idx < invoiceSpecs.length; idx++) {
      const inv = invoiceSpecs[idx];
      const dueDate = new Date(now.getTime() + inv.offsetDays * dayMs).toISOString().slice(0, 10);
      const ath = allAthletes[idx % allAthletes.length];

      const existingInv = await ctx.db
        .query("invoices")
        .withIndex("by_academy", (q) => q.eq("academyId", academyId))
        .filter((q) => q.eq(q.field("invoiceNumber"), inv.num))
        .first();

      if (!existingInv) {
        await ctx.db.insert("invoices", {
          academyId,
          athleteId: ath._id,
          invoiceNumber: inv.num,
          description: inv.desc,
          amount: inv.amount,
          currency: "USD",
          dueDate,
          status: inv.status,
          note: `Auto-generated invoice for ${ath.firstName} ${ath.lastName}`,
          issuedAt: new Date(now.getTime() - 25 * dayMs).toISOString(),
          createdBy: adminId,
        });
        createdInvoices++;
      }
    }

    // 11. Announcements
    const announcementSpecs = [
      {
        title: "National Youth Championship Trial Dates Finalized",
        content: "Trials will take place at the Camille Chamoun Stadium main track on Saturday morning. All athletes must check in with biometric pins by 08:30 AM.",
        category: "meet_schedule" as const,
        priority: "urgent" as const,
        isPinned: true,
      },
      {
        title: "Fall Hydration & Recovery Protocol",
        content: "Coaching staff have implemented electro-hydration monitoring post-session. Please review the updated hydration guidelines on your athlete portal.",
        category: "general" as const,
        priority: "important" as const,
        isPinned: false,
      },
      {
        title: "Weight Room & High Performance Lab Upgrades",
        content: "New electronic linear encoders and force plates have been calibrated in Weight Room Alpha for vertical jump and velocity-based training.",
        category: "facility" as const,
        priority: "normal" as const,
        isPinned: false,
      },
    ];

    let createdAnnouncements = 0;
    for (const ann of announcementSpecs) {
      const existing = await ctx.db
        .query("announcements")
        .withIndex("by_academy", (q) => q.eq("academyId", academyId))
        .filter((q) => q.eq(q.field("title"), ann.title))
        .first();

      if (!existing) {
        await ctx.db.insert("announcements", {
          academyId,
          title: ann.title,
          content: ann.content,
          category: ann.category,
          priority: ann.priority,
          isPinned: ann.isPinned,
          createdBy: adminId,
          createdAt: nowIso,
        });
        createdAnnouncements++;
      }
    }

    return {
      success: true,
      academyName: academy.name,
      academyId,
      athletesTotal: allAthletes.length,
      newAthletesAdded: newAthletesCount,
      teamsTotal: teamsMap.size,
      sessionsAdded: createdSessionsCount,
      attendanceRecordsAdded: attendanceCount,
      assessmentsAdded: createdAssessments,
      drillsAdded: createdDrills,
      trainingPlansAdded: createdPlans,
      feesAdded: createdFees,
      paymentsRecorded: createdPayments,
      invoicesAdded: createdInvoices,
      announcementsAdded: createdAnnouncements,
    };
  },
});
