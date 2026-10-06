import { mutation } from "./_generated/server.js";

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("academies").first();
    if (existing) {
      return {
        message: "Database already contains academies. Skipped to prevent duplicates.",
        academy: existing.name,
      };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Create Coach/Admin User
    const adminUser = await ctx.db.insert("users", {
      name: "Coach Ahmad",
      email: "ah.baalbaki@gmail.com",
      role: "platform_admin",
    });

    // 2. Create Primary Academy
    const academyId = await ctx.db.insert("academies", {
      name: "Hercules Sports Academy",
      slug: "hercules-sports",
      status: "active",
      createdAt: nowIso,
      nextInvoiceNumber: 101,
      createdBy: adminUser,
    });

    // Link user to academy
    await ctx.db.patch("users", adminUser, { academyId });

    // Secondary Academy
    const secondAcademyId = await ctx.db.insert("academies", {
      name: "Cedars Athletic Club",
      slug: "cedars-athletics",
      status: "active",
      createdAt: nowIso,
      nextInvoiceNumber: 1,
      createdBy: adminUser,
    });

    // 3. Create Teams
    const trackTeamId = await ctx.db.insert("teams", {
      academyId,
      name: "Sprint & Power Squad",
      sport: "Track & Field",
      createdBy: adminUser,
      createdAt: nowIso,
    });

    const soccerTeamId = await ctx.db.insert("teams", {
      academyId,
      name: "Elite Academy U16",
      sport: "Soccer",
      createdBy: adminUser,
      createdAt: nowIso,
    });

    // 4. Create Athletes
    const athletesData = [
      {
        firstName: "Lara",
        lastName: "Khoury",
        email: "lara.khoury@athlete.test",
        gender: "female" as const,
        sport: "Track & Field",
        dateOfBirth: "2010-03-14",
        heightCm: 165,
        weightKg: 52,
        phone: "+961 70 111 201",
        guardianName: "Rania Khoury",
        guardianEmail: "rania.khoury@family.test",
        teamId: trackTeamId,
        checkInPin: "1001",
      },
      {
        firstName: "Omar",
        lastName: "Saleh",
        email: "omar.saleh@athlete.test",
        gender: "male" as const,
        sport: "Track & Field",
        dateOfBirth: "2011-07-02",
        heightCm: 170,
        weightKg: 58,
        phone: "+961 71 222 301",
        notes: "Excellent sprint acceleration; focus on stride frequency.",
        guardianName: "Samir Saleh",
        guardianEmail: "samir.saleh@family.test",
        teamId: trackTeamId,
        checkInPin: "1002",
      },
      {
        firstName: "Yara",
        lastName: "Nassar",
        email: "yara.nassar@athlete.test",
        gender: "female" as const,
        sport: "Track & Field",
        dateOfBirth: "2012-11-21",
        heightCm: 158,
        weightKg: 45,
        phone: "+961 76 333 401",
        guardianName: "Mona Nassar",
        guardianEmail: "mona.nassar@family.test",
        teamId: trackTeamId,
        checkInPin: "1003",
      },
      {
        firstName: "Marcus",
        lastName: "Sterling",
        email: "marcus.sterling@athlete.test",
        gender: "male" as const,
        sport: "Soccer",
        dateOfBirth: "2010-05-18",
        heightCm: 176,
        weightKg: 68,
        phone: "+961 70 444 501",
        guardianName: "David Sterling",
        guardianEmail: "david.sterling@family.test",
        teamId: soccerTeamId,
        checkInPin: "2001",
      },
      {
        firstName: "Leo",
        lastName: "Silva",
        email: "leo.silva@athlete.test",
        gender: "male" as const,
        sport: "Soccer",
        dateOfBirth: "2011-09-12",
        heightCm: 169,
        weightKg: 61,
        phone: "+961 71 555 601",
        guardianName: "Helena Silva",
        guardianEmail: "helena.silva@family.test",
        teamId: soccerTeamId,
        checkInPin: "2002",
      },
      {
        firstName: "Elena",
        lastName: "Rostova",
        email: "elena.rostova@athlete.test",
        gender: "female" as const,
        sport: "Soccer",
        dateOfBirth: "2010-12-04",
        heightCm: 167,
        weightKg: 55,
        phone: "+961 76 666 701",
        guardianName: "Alexei Rostov",
        guardianEmail: "alexei.rostov@family.test",
        teamId: soccerTeamId,
        checkInPin: "2003",
      },
    ];

    const insertedAthletes = [];
    for (const a of athletesData) {
      const athleteId = await ctx.db.insert("athletes", {
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
        createdBy: adminUser,
        createdAt: nowIso,
      });

      // Add to team
      await ctx.db.insert("teamMembers", {
        academyId,
        teamId: a.teamId,
        athleteId,
        createdAt: nowIso,
      });

      insertedAthletes.push({ ...a, _id: athleteId });
    }

    // 5. Create Training Sessions
    const dayMs = 24 * 60 * 60 * 1000;
    const pastSessionDate = new Date(now.getTime() - 2 * dayMs).toISOString();
    const upcomingSessionDate = new Date(now.getTime() + 2 * dayMs).toISOString();

    const sessionPast = await ctx.db.insert("trainingSessions", {
      academyId,
      teamId: trackTeamId,
      title: "Sprint Acceleration & Block Starts",
      startsAt: pastSessionDate,
      durationMinutes: 90,
      location: "Main Track, Camille Chamoun Stadium",
      notes: "High intensity speed drills with photoelectric timing gates.",
      createdBy: adminUser,
      createdAt: nowIso,
    });

    const sessionUpcoming = await ctx.db.insert("trainingSessions", {
      academyId,
      teamId: trackTeamId,
      title: "Plyometrics & Top Speed Mechanics",
      startsAt: upcomingSessionDate,
      durationMinutes: 90,
      location: "Main Track, Camille Chamoun Stadium",
      notes: "Bring resistance bands and spike shoes.",
      createdBy: adminUser,
      createdAt: nowIso,
    });

    const soccerSessionPast = await ctx.db.insert("trainingSessions", {
      academyId,
      teamId: soccerTeamId,
      title: "Possession Rondos & Rapid Transitions",
      startsAt: pastSessionDate,
      durationMinutes: 90,
      location: "Pitch A - Sport Complex",
      notes: "Focus on 3-touch limits and counter-pressing triggers.",
      createdBy: adminUser,
      createdAt: nowIso,
    });

    // 6. Record Attendance for past session
    for (const ath of insertedAthletes.filter((a) => a.teamId === trackTeamId)) {
      await ctx.db.insert("attendanceRecords", {
        academyId,
        sessionId: sessionPast,
        athleteId: ath._id,
        status: ath.firstName === "Omar" ? "late" : "present",
        recordedBy: adminUser,
        recordedAt: pastSessionDate,
      });
    }

    // 7. Insert Assessments
    const metrics = [
      { metric: "Sprint 40m (s)", unit: "s", values: [5.42, 5.18, 5.65, 5.30, 5.22, 5.48] },
      { metric: "Vertical Jump (cm)", unit: "cm", values: [48.5, 54.0, 44.0, 52.0, 50.5, 47.0] },
      { metric: "Agility T-Test (s)", unit: "s", values: [10.8, 10.2, 11.4, 10.4, 10.1, 10.9] },
    ];

    let assessmentCount = 0;
    for (const m of metrics) {
      for (let i = 0; i < insertedAthletes.length; i++) {
        await ctx.db.insert("assessments", {
          academyId,
          athleteId: insertedAthletes[i]._id,
          metric: m.metric,
          value: m.values[i],
          unit: m.unit,
          assessedOn: new Date(now.getTime() - 7 * dayMs).toISOString().slice(0, 10),
          notes: "Baseline measurement",
          createdBy: adminUser,
          createdAt: nowIso,
        });
        assessmentCount++;
      }
    }

    // 8. Create Announcements
    await ctx.db.insert("announcements", {
      academyId,
      title: "Welcome to the New Academy Training Season",
      content:
        "Welcome athletes and coaches! Training schedules and biomechanics motion assessments are now live on the platform. Please verify your upcoming session times.",
      category: "general",
      priority: "important",
      isPinned: true,
      createdBy: adminUser,
      createdAt: nowIso,
    });

    await ctx.db.insert("announcements", {
      academyId,
      title: "Regional Athletic Meet Schedule Announced",
      content:
        "Qualifying trials will take place this Saturday morning at 09:00 AM. Attendance is mandatory for all sprint squad members.",
      category: "meet_schedule",
      priority: "urgent",
      targetTeamId: trackTeamId,
      isPinned: false,
      createdBy: adminUser,
      createdAt: nowIso,
    });

    return {
      status: "success",
      academiesCreated: 2,
      teamsCreated: 2,
      athletesCreated: insertedAthletes.length,
      sessionsCreated: 3,
      assessmentsCreated: assessmentCount,
      announcementsCreated: 2,
      primaryAcademy: "Hercules Sports Academy",
    };
  },
});

export const seedUserInitialAcademies = mutation({
  args: {},
  handler: async (ctx) => {
    const adminUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "ah.baalbaki@gmail.com"))
      .first();

    const adminId = adminUser?._id;
    const nowIso = new Date().toISOString();

    const academiesToSeed = [
      { name: "Haj Ali", slug: "acad_0qbqv4w", status: "active" as const },
      { name: "AL-Hakkani", slug: "acad_0xecsfc", status: "active" as const },
      { name: "SportZona", slug: "sportzona", status: "active" as const },
      { name: "AL-Hakkani", slug: "al-hakkani", status: "active" as const },
      { name: "EliteAcademy", slug: "eliteacademy", status: "active" as const },
    ];

    const results = [];
    for (const a of academiesToSeed) {
      const existing = await ctx.db
        .query("academies")
        .withIndex("by_slug", (q) => q.eq("slug", a.slug))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("academies", {
          name: a.name,
          slug: a.slug,
          status: a.status,
          nextInvoiceNumber: 1,
          createdAt: nowIso,
          createdBy: adminId,
        });
        results.push({ name: a.name, slug: a.slug, action: "created", id });
      } else {
        results.push({ name: a.name, slug: a.slug, action: "exists", id: existing._id });
      }
    }

    return { success: true, academies: results };
  },
});

