export interface SoccerDrill {
  id: string;
  title: string;
  ageGroup: "U6-U8" | "U9-U10" | "U11-U12" | "U13-U14" | "U15-U16" | "All U16";
  birthYears: string; // e.g. "2018–2020"
  category:
    | "ball_mastery"
    | "passing_rondos"
    | "shooting_finishing"
    | "tactical_possession"
    | "defending_pressing"
    | "agility_speed"
    | "goalkeeping";
  categoryLabel: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  durationMinutes: number;
  recommendedSets: number;
  recommendedReps: number;
  durationSeconds?: number;
  gridDimensions: string;
  equipment: string[];
  summary: string;
  setup: string;
  instructions: string[];
  coachingPoints: string[];
  variations: string[];
  metricPresetId?: string;

  // Performance tracking & statistics analysis specification
  metricName?: string;
  metricUnit?: string;
  benchmark?: number;
  isLowerBetter?: boolean;
  targetAttribute?:
    | "Speed"
    | "Power"
    | "Agility"
    | "Strength"
    | "Endurance"
    | "Mobility"
    | "Technical"
    | "Tactical";
  isCustom?: boolean;
  academyId?: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
  version?: string;
  tags?: string[];
}

export const SOCCER_DRILLS: SoccerDrill[] = [
  // ==========================================
  // U6 - U8 (Born 2018–2020) FUNDAMENTALS & BALL MASTERY
  // ==========================================
  {
    id: "u6-toe-tap-castle",
    title: "Toe-Tap & Foundation Castle",
    ageGroup: "U6-U8",
    birthYears: "2018–2020",
    category: "ball_mastery",
    categoryLabel: "Ball Mastery & Control",
    difficulty: "Beginner",
    durationMinutes: 10,
    recommendedSets: 4,
    recommendedReps: 30,
    durationSeconds: 180,
    gridDimensions: "10m x 10m grid (The Castle)",
    equipment: ["1 ball per player", "4 corner cones", "Tall cones for gates"],
    summary:
      "Playful rhythm exercise developing light sole-touches and side-to-side boxing with the inside of both feet.",
    setup:
      "Mark a 10x10m square called 'The Castle'. Every athlete has a ball at their feet.",
    instructions: [
      "On coach's whistle, players perform alternating toe taps on top of the ball without pushing it away.",
      "Call 'Switch!' — players transition to side-to-side boxing (tick-tocks) using the inside of both feet.",
      "Call 'Freeze!' — players stop the ball instantly with the sole of their foot and balance on one leg for 3 seconds.",
      "Add mini challenges: 20 quick toe taps, then dribble around one castle tower cone.",
    ],
    coachingPoints: [
      "Stay on toes with knees slightly bent for balance.",
      "Light, rhythmic touches — do not stomp down on the ball.",
      "Keep head up occasionally to see other teammates inside the grid.",
    ],
    variations: [
      "Reverse taps: move backward slowly while maintaining alternating taps.",
      "High knees bonus round for cardio coordination.",
    ],
  },
  {
    id: "u6-sharks-and-minnows",
    title: "Sharks & Minnows Dribble Escape",
    ageGroup: "U6-U8",
    birthYears: "2018–2020",
    category: "ball_mastery",
    categoryLabel: "Dribbling & 1v1",
    difficulty: "Beginner",
    durationMinutes: 15,
    recommendedSets: 5,
    recommendedReps: 1,
    durationSeconds: 300,
    gridDimensions: "15m x 20m ocean grid",
    equipment: ["Cones", "1 ball per minnow", "Different colored pinnies for sharks"],
    summary:
      "Classic youth soccer game teaching change of pace, shielding, keeping eyes up, and directional ball escape.",
    setup:
      "Designate an end line (Beach A) and the opposite end line (Beach B). 1-2 players start as 'Sharks' in the middle without balls. All other players are 'Minnows' with a ball on Beach A.",
    instructions: [
      "On 'Swim Minnows, Swim!', players dribble across the grid to the opposite safe beach.",
      "Sharks attempt to kick minnows' balls out of bounds.",
      "If a minnow's ball is kicked out, they join the sharks for the next round.",
      "Play until 1-2 champion minnows remain, then reset.",
    ],
    coachingPoints: [
      "Keep the ball within 1-2 steps when sharks are near (close control).",
      "Accelerate into open space when past the defenders (change of speed).",
      "Use the sole of the foot or outside cut to change direction away from danger.",
    ],
    variations: [
      "Require minnows to perform a sole drag-back turn before crossing the halfway line.",
      "Two safe islands in the center where minnows can rest for 3 seconds.",
    ],
  },
  {
    id: "u6-pirate-treasure-gates",
    title: "Pirate Treasure Gate Dribbling",
    ageGroup: "U6-U8",
    birthYears: "2018–2020",
    category: "ball_mastery",
    categoryLabel: "Agility & Dribbling",
    difficulty: "Beginner",
    durationMinutes: 12,
    recommendedSets: 3,
    recommendedReps: 1,
    durationSeconds: 120,
    gridDimensions: "15m x 15m grid with 8 cone gates",
    equipment: ["16 cones (making 8 1-meter gates)", "1 ball per player"],
    summary:
      "Develops spatial awareness, sharp turns, and ambidextrous dribbling using both feet in a dense environment.",
    setup:
      "Scatter 8 pairs of cones (1m wide gates) randomly across a 15x15m grid. Each gate is a 'treasure chest'.",
    instructions: [
      "Players have 60 seconds to dribble through as many different cone gates as possible.",
      "Rule: A player cannot go through the same gate twice in a row.",
      "Each successful gate dribbled through earns 1 gold coin.",
      "Players keep track of their score and try to beat their personal record in Round 2.",
    ],
    coachingPoints: [
      "Use both the right and left foot (inside and outside surfaces).",
      "Look up between touches to spot empty, unclaimed gates.",
      "Sharp acceleration right after bursting through a gate.",
    ],
    variations: [
      "Left-foot only round.",
      "Add a 'Pirate Hunter' (coach or defender) who blocks gates.",
    ],
    metricPresetId: "slalom_dribble",
  },
  {
    id: "u6-red-light-green-light",
    title: "Red Light, Green Light Braking & Acceleration",
    ageGroup: "U6-U8",
    birthYears: "2018–2020",
    category: "agility_speed",
    categoryLabel: "Speed & Deceleration",
    difficulty: "Beginner",
    durationMinutes: 10,
    recommendedSets: 4,
    recommendedReps: 1,
    durationSeconds: 120,
    gridDimensions: "12m x 20m lane",
    equipment: ["Cones for start and finish line", "1 ball per player"],
    summary:
      "Teaches explosive acceleration and urgent sole-braking control, building essential neuromuscular deceleration.",
    setup:
      "All athletes start on the baseline with a ball. Coach stands at the far end line 20m away.",
    instructions: [
      "Green Light: Players dribble fast toward the finish line.",
      "Yellow Light: Slow, controlled micro-touches with ball glued to feet.",
      "Red Light: Instant stop with sole of the foot on top of the ball. Complete freeze.",
      "Anyone whose ball is still rolling on Red Light must take 2 steps backward.",
    ],
    coachingPoints: [
      "On 'Green Light', push the ball forward into space with laces.",
      "On 'Red Light', lower body center of mass and trap ball firmly under the sole.",
      "Eyes forward on the coach at all times.",
    ],
    variations: [
      "Add 'Purple Light' = 5 quick toe taps before resuming.",
      "Play with opposite foot only on Round 2.",
    ],
  },

  // ==========================================
  // U9 - U10 (Born 2016–2017) 1v1 SKILLS & SMALL-SIDED PLAY
  // ==========================================
  {
    id: "u9-cruyff-stepover-box",
    title: "Cruyff Turn & Step-Over 1v1 Escape",
    ageGroup: "U9-U10",
    birthYears: "2016–2017",
    category: "ball_mastery",
    categoryLabel: "1v1 Moves & Feints",
    difficulty: "Beginner",
    durationMinutes: 15,
    recommendedSets: 4,
    recommendedReps: 8,
    durationSeconds: 240,
    gridDimensions: "12m x 12m square with central mannequins or cones",
    equipment: ["Cones", "1 ball per player", "2 mini goals"],
    summary:
      "Teaches the biomechanics of deception: fake pass/strike followed by a sudden Cruyff turn or step-over change of direction.",
    setup:
      "Place 4 central dummy cones representing defenders. Players start at outer cones facing inward.",
    instructions: [
      "Player dribbles with speed toward central dummy cone.",
      "At 1 meter from the cone, athlete feints a shot and performs a sharp Cruyff turn (hooking ball behind standing leg with inside of kicking foot).",
      "Explode 5 meters in the new direction with a burst of speed.",
      "Next rep: execute an outside-in Step-Over with hips dropped, driving away with opposite foot.",
      "Progress to live 1v1 duel against a passive, then active defender.",
    ],
    coachingPoints: [
      "Sell the fake: arm out, head down, big backswing as if shooting.",
      "Plant standing foot beside and slightly ahead of the ball.",
      "Immediate explosive acceleration on the exit touch.",
    ],
    variations: [
      "Add a mini goal at the exit — finish with accurate inside-foot placement.",
      "Combine Cruyff turn into immediate secondary scissor move.",
    ],
    metricPresetId: "one_v_one_wins",
  },
  {
    id: "u9-3v1-triangle-rondo",
    title: "3v1 Triangle Rondo with Scanning",
    ageGroup: "U9-U10",
    birthYears: "2016–2017",
    category: "passing_rondos",
    categoryLabel: "Passing & Rondos",
    difficulty: "Intermediate",
    durationMinutes: 15,
    recommendedSets: 5,
    recommendedReps: 1,
    durationSeconds: 180,
    gridDimensions: "8m x 8m triangle or square grid",
    equipment: ["Cones", "1 ball", "Pinnies for defender"],
    summary:
      "Fundamental possession exercise introducing body shape, back-foot receiving, passing angles, and scanning.",
    setup:
      "Mark an 8x8m triangle or square. 3 attackers on the perimeter, 1 defender in the middle.",
    instructions: [
      "Attackers keep possession by circulating the ball with quick 1-2 touch passing.",
      "The player on the ball must always have two passing options (left and right support angles).",
      "If the defender intercepts or touches the ball, the player who made the error switches into the center.",
      "Target: complete 10 consecutive passes without the defender touching the ball.",
    ],
    coachingPoints: [
      "Receive on the back foot (foot farthest from the ball) to open body shape.",
      "Firm, crisp passing with the inside of the foot along the grass.",
      "Scan the defender's positioning before the ball arrives.",
      "Support teammates immediately after passing (move 2-3 steps into a passing lane).",
    ],
    variations: [
      "Maximum 2-touch constraint for all attackers.",
      "1-touch bonus point for third-man passes.",
    ],
    metricPresetId: "rondo_streak",
  },
  {
    id: "u9-cone-slalom-laces-strike",
    title: "Cone Slalom Dribble & Laces Strike",
    ageGroup: "U9-U10",
    birthYears: "2016–2017",
    category: "shooting_finishing",
    categoryLabel: "Shooting & Finishing",
    difficulty: "Intermediate",
    durationMinutes: 15,
    recommendedSets: 4,
    recommendedReps: 6,
    durationSeconds: 180,
    gridDimensions: "Penalty box to 25m out",
    equipment: ["5 agility cones", "Regulation goal with goalkeeper or target corners", "Soccer balls"],
    summary:
      "Connects technical footwork under fatigue directly into a powerful laces drive aimed at the low corners.",
    setup:
      "Set 5 cones in a slalom line 2m apart starting 25m from goal. Goal has targets in bottom corners.",
    instructions: [
      "Athlete starts at cone 1, navigating the slalom using alternating inside/outside touches.",
      "On exiting the final cone, take one directional touch out of feet at a 45-degree angle.",
      "Strike firmly through the center of the ball with laces (instep drive), aiming for low corners.",
      "Follow through landing on the kicking foot.",
    ],
    coachingPoints: [
      "Keep toes pointed down and ankle locked firmly through contact.",
      "Chest and head over the ball to keep the strike low and driven.",
      "Non-kicking foot planted 15cm beside the ball pointing at the target.",
    ],
    variations: [
      "Alternate repetitions: Rep 1 right foot, Rep 2 left foot.",
      "Add a recovering defender who sprints from the side as player exits the slalom.",
    ],
    metricPresetId: "target_shots",
  },
  {
    id: "u9-four-corner-back-foot",
    title: "Four-Corner Back-Foot Receiving Box",
    ageGroup: "U9-U10",
    birthYears: "2016–2017",
    category: "passing_rondos",
    categoryLabel: "Receiving & Ball Circulation",
    difficulty: "Intermediate",
    durationMinutes: 12,
    recommendedSets: 4,
    recommendedReps: 12,
    durationSeconds: 180,
    gridDimensions: "10m x 10m diamond or square",
    equipment: ["4 corner cones", "2 balls per group"],
    summary:
      "Ingrains the muscle memory of opening hips and cushioning the ball across the body with the back foot.",
    setup:
      "4 cones forming a 10x10m square with 1-2 players at each corner.",
    instructions: [
      "Player A passes clockwise along the perimeter to Player B.",
      "Player B prepares with an open body shape, receives with their back foot across their body, and passes to Player C with their second touch.",
      "After passing, follow your pass to the next station.",
      "Switch directions to counter-clockwise after 5 minutes to train the opposite foot.",
    ],
    coachingPoints: [
      "Check away from the cone before receiving to create personal space.",
      "Cushion first touch 1 meter in front in the direction of the next pass.",
      "Keep communication verbal: call 'Yes!', 'Turn!', or 'Feet!'.",
    ],
    variations: [
      "Progress to Give-and-Go one-two with the passing teammate before advancing.",
    ],
    metricPresetId: "first_touch_box",
  },

  // ==========================================
  // U11 - U12 (Born 2014–2015) TRANSITION & TACTICAL SHAPE
  // ==========================================
  {
    id: "u11-4v2-transition-rondo",
    title: "4v2 Transition Breakout Rondo",
    ageGroup: "U11-U12",
    birthYears: "2014–2015",
    category: "passing_rondos",
    categoryLabel: "Passing & Transition",
    difficulty: "Intermediate",
    durationMinutes: 18,
    recommendedSets: 4,
    recommendedReps: 1,
    durationSeconds: 240,
    gridDimensions: "12m x 12m grid with 2 counter mini-goals",
    equipment: ["Cones", "Pinnies for 2 defenders", "Mini goals", "Balls"],
    summary:
      "Develops spatial depth, line-breaking passes, and immediate defensive pressing when the ball is lost.",
    setup:
      "12x12m square. 4 attackers along the edges, 2 defenders inside the box. 2 mini goals outside the grid.",
    instructions: [
      "Attackers maintain possession using 2 touches maximum.",
      "Defenders work as a pair: 1 presses the ball, 1 provides cover and cuts the split pass.",
      "If defenders win the ball, they immediately transition and attempt to score in either mini-goal within 5 seconds.",
      "Attackers must instantly counter-press upon losing possession to prevent the shot.",
    ],
    coachingPoints: [
      "Look for the 'split pass' between the two defenders when space opens.",
      "Pass with game weight: firm passes that don't bounce.",
      "Defenders: curve your run to show the attacker one way (force outside).",
      "Immediate 3-second counter-press when possession changes.",
    ],
    variations: [
      "1-touch only for attackers on perimeter.",
      "If attackers complete 12 passes, defenders do 5 push-ups.",
    ],
    metricPresetId: "rondo_streak",
  },
  {
    id: "u11-winger-overlap-cross",
    title: "Winger Overlap & Box Finishing Waves",
    ageGroup: "U11-U12",
    birthYears: "2014–2015",
    category: "shooting_finishing",
    categoryLabel: "Crossing & Finishing",
    difficulty: "Intermediate",
    durationMinutes: 20,
    recommendedSets: 4,
    recommendedReps: 6,
    durationSeconds: 300,
    gridDimensions: "Half pitch (wide channel to penalty box)",
    equipment: ["Full goal with GK", "Mannequins or cones", "Soccer balls"],
    summary:
      "Tactical combination training overlapping fullback runs, driven wide crosses, and timed penalty box entry.",
    setup:
      "Central midfielder, winger, and overlapping fullback. 2 attacking runners (near post & far post) and 1 center-back defender in the box.",
    instructions: [
      "Midfielder plays into winger who drives inside toward mannequin.",
      "Fullback executes an explosive overlapping sprint around the outside.",
      "Winger slips a timed through-ball into the fullback's running path.",
      "Fullback crosses with 1st or 2nd touch: Near post, Far post, or Cutback to penalty spot.",
      "Two box runners time their runs: 1 darts to near post across defender, 1 holds at penalty spot for cutback.",
      "One-touch finish on goal.",
    ],
    coachingPoints: [
      "Timing of the overlap: do not run too early to stay onside and maintain momentum.",
      "Cross delivery: low driven cross between penalty spot and 6-yard box is most dangerous.",
      "Attacking runners stagger their arrival — do not arrive in the box before the cross is kicked.",
    ],
    variations: [
      "Add an underlapping run inside the winger instead of overlap.",
      "Add a second recovering defender.",
    ],
    metricPresetId: "target_shots",
  },
  {
    id: "u11-aerial-cushion-touch",
    title: "Aerial First Touch & Volley Control",
    ageGroup: "U11-U12",
    birthYears: "2014–2015",
    category: "ball_mastery",
    categoryLabel: "Aerial Control & First Touch",
    difficulty: "Intermediate",
    durationMinutes: 15,
    recommendedSets: 4,
    recommendedReps: 10,
    durationSeconds: 180,
    gridDimensions: "5m x 5m target boxes",
    equipment: ["Cones for boxes", "1 ball per pair"],
    summary:
      "Trains athletes to judge flight of lofted balls, cushion with thigh, chest, or laces, and keep the ball inside the box.",
    setup:
      "Pairs set up 15 meters apart. Each player stands inside a 3x3m cone box.",
    instructions: [
      "Player A plays a lofted 15-meter driven or clipped aerial pass to Player B.",
      "Player B must control the ball out of the air using specified surface (Thigh, Chest, or Laces cushion).",
      "Goal: The ball must settle on the grass inside their 3x3m box on touch 1, and return an accurate pass on touch 2.",
      "Score 1 point for every successful control kept inside the boundary box.",
    ],
    coachingPoints: [
      "Get body in line with the flight of the ball early.",
      "Relax the receiving surface (cushion impact like catching an egg).",
      "Knee bent, soft ankle on laces cushion touch.",
    ],
    variations: [
      "Half-volley return pass on touch 2.",
      "Control and turn 180 degrees through an exit gate.",
    ],
    metricPresetId: "first_touch_box",
  },
  {
    id: "u11-illinois-soccer-agility",
    title: "Illinois Soccer Agility & Dribble Test",
    ageGroup: "U11-U12",
    birthYears: "2014–2015",
    category: "agility_speed",
    categoryLabel: "Agility & Deceleration",
    difficulty: "Advanced",
    durationMinutes: 15,
    recommendedSets: 3,
    recommendedReps: 2,
    durationSeconds: 120,
    gridDimensions: "10m x 5m agility course",
    equipment: ["8 cones", "Stopwatch", "1 soccer ball"],
    summary:
      "Standardized multi-directional agility protocol incorporating rapid 180-degree cuts and cone weaves with and without ball.",
    setup:
      "Set 4 corner cones (10m x 5m rectangle) and 4 center cones 3.3m apart in a straight line.",
    instructions: [
      "Athlete sprints 10m from start to top cone, touches line, sprints back 10m to bottom cone.",
      "Weaves through the 4 center cones up and back.",
      "Explodes around opposite bottom cone and sprints 10m to finish line.",
      "Rep 1: Body sprint without ball.",
      "Rep 2: Complete the full course while dribbling with the soccer ball.",
    ],
    coachingPoints: [
      "Lower hips before planting for 180-degree turn to minimize braking time.",
      "Use short, choppy adjustment steps around center weave cones.",
      "Explosive arm drive on the final straight sprint.",
    ],
    variations: [
      "Compare with/without ball time differential to measure technical efficiency.",
    ],
    metricPresetId: "illinois_agility",
  },

  // ==========================================
  // U13 - U14 (Born 2012–2013) POSITIONAL PLAY & TACTICAL ROLES
  // ==========================================
  {
    id: "u13-5v5-positional-possession",
    title: "5v5+2 Positional Possession with Bumpers",
    ageGroup: "U13-U14",
    birthYears: "2012–2013",
    category: "tactical_possession",
    categoryLabel: "Positional Play & Tactical",
    difficulty: "Advanced",
    durationMinutes: 20,
    recommendedSets: 4,
    recommendedReps: 1,
    durationSeconds: 300,
    gridDimensions: "25m x 25m grid with end bumpers",
    equipment: ["Cones", "3 colors of pinnies (5 blue, 5 red, 2 neutral yellow)"],
    summary:
      "Teaches tactical spacing, creating overloads (+2 neutrals), and switching play through central pivots.",
    setup:
      "25x25m grid. 5v5 inside the box + 2 neutral players (1 central midfielder, 1 target player).",
    instructions: [
      "Team in possession plays with the 2 neutral players to create a 7v5 numerical overload.",
      "Objective: Circulate the ball from one side to the other, connecting with the central neutral pivot.",
      "Target: Complete 8 consecutive passes to score 1 point, or complete a 'third-man combination' for 2 points.",
      "If defending team wins the ball, they immediately expand to perimeter positions while opposing team contracts to press.",
    ],
    coachingPoints: [
      "Width and depth: make the pitch as big as possible in possession.",
      "Body orientation: always see 3 corners of the pitch when receiving.",
      "Third-man concept: Player A passes to Player B, who sets back to Player C running into open space.",
    ],
    variations: [
      "2-touch constraint on neutral players.",
      "Score by connecting from wide neutral to opposite wide neutral through central midfielder.",
    ],
    metricPresetId: "rondo_streak",
  },
  {
    id: "u13-high-pressing-triggers",
    title: "High Pressing & Compact Block Triggers",
    ageGroup: "U13-U14",
    birthYears: "2012–2013",
    category: "defending_pressing",
    categoryLabel: "Defending & Pressing",
    difficulty: "Advanced",
    durationMinutes: 20,
    recommendedSets: 4,
    recommendedReps: 1,
    durationSeconds: 300,
    gridDimensions: "40m x 30m defending third zone",
    equipment: ["Full goal with GK", "2 mini counter goals", "Balls", "Pinnies"],
    summary:
      "Trains defensive lines to recognize pressing triggers (poor touch, backward pass, bouncing ball) and swarm as a unit.",
    setup:
      "Building team (Back 4 + CDM + GK) vs Pressing team (3 Forwards + 2 Attacking Midfielders).",
    instructions: [
      "GK rolls ball to one of the center-backs to begin build-up play.",
      "Pressing trigger 1: Center-back plays a slow or bouncing pass to the fullback.",
      "Winger immediately presses with a curved sprint cutting off the down-the-line pass.",
      "Striker presses from behind, cutting off the back-pass to the center-back.",
      "Central midfielder locks onto opposing CDM.",
      "If pressing team wins possession, they have 6 seconds to score in the big goal.",
      "If building team breaks the press, they score in either mini counter-goal on the halfway line.",
    ],
    coachingPoints: [
      "Press as a hunting pack: when 1 player presses, all 5 players step up 5 yards together.",
      "Curved run geometry: use your 'cover shadow' to block the passing lane behind you.",
      "Don't dive in: slow down 1 yard before the attacker to avoid getting beaten by a fake.",
    ],
    variations: [
      "Require building team to complete 4 passes before crossing halfway line.",
    ],
    metricPresetId: "drill_rating",
  },
  {
    id: "u13-diagonal-switch-cutback",
    title: "Midfield Diagonal Switch & Cutback Finish",
    ageGroup: "U13-U14",
    birthYears: "2012–2013",
    category: "shooting_finishing",
    categoryLabel: "Tactical Finishing & Crossing",
    difficulty: "Advanced",
    durationMinutes: 18,
    recommendedSets: 4,
    recommendedReps: 6,
    durationSeconds: 240,
    gridDimensions: "Full attacking half",
    equipment: ["Full goal with GK", "Mannequins", "Cones", "Balls"],
    summary:
      "Emulates elite tactical patterns: central midfielder playing a 35m driven diagonal switch to winger, followed by a cutback cross.",
    setup:
      "Central playmaker at center circle. Winger wide right. Attacking midfielder and Striker positioned outside the penalty area.",
    instructions: [
      "Playmaker receives from coach, takes 1 prep touch, and hits a driven 35m diagonal pass into the stride of wide winger.",
      "Winger controls with positive first touch attacking the penalty box byline.",
      "Striker makes a decoy run dragging center-back toward the near post.",
      "Attacking midfielder makes an intelligent delayed run arriving at the penalty spot (cutback zone).",
      "Winger delivers a firm low cutback along the grass.",
      "Attacking midfielder finishes first-time into corners.",
    ],
    coachingPoints: [
      "Playmaker: strike through the bottom-center of the ball with locked ankle for a flat, driven trajectory.",
      "Winger: look up before crossing to spot the arriving midfielder.",
      "Finisher: lock ankle and pass the ball into the net — precision over pure power.",
    ],
    variations: [
      "Add 1 center-back to challenge the cutback delivery.",
      "Alternate from left wing and right wing.",
    ],
    metricPresetId: "target_shots",
  },
  {
    id: "u13-rapid-counter-press-5sec",
    title: "Rapid Counter-Press (5-Second Swarm)",
    ageGroup: "U13-U14",
    birthYears: "2012–2013",
    category: "defending_pressing",
    categoryLabel: "Defending & Pressing",
    difficulty: "Advanced",
    durationMinutes: 16,
    recommendedSets: 4,
    recommendedReps: 1,
    durationSeconds: 240,
    gridDimensions: "20m x 20m box",
    equipment: ["Cones", "Pinnies for 2 teams of 4"],
    summary:
      "Instills the modern transitional principle: winning the ball back within 5 seconds of turnover while opponent is unorganized.",
    setup:
      "4v4 inside a 20x20m box with coach on the sideline with supply of balls.",
    instructions: [
      "Team A has possession. On coach's command 'Turnover!', Team A must intentionally kick ball to Team B.",
      "Team A immediately initiates an aggressive 5-second counter-press.",
      "If Team A regains the ball within 5 seconds, they receive 3 points.",
      "If Team B completes 3 passes out of pressure, Team B receives 2 points.",
    ],
    coachingPoints: [
      "Closest player to the ball applies immediate maximum physical pressure.",
      "Teammates cut the easiest escape routes (lock them against the sideline).",
      "High intensity, low body position, ready to intercept poor hurried passes.",
    ],
    variations: [
      "Add mini goals on opposite sides for transition scoring.",
    ],
    metricPresetId: "drill_rating",
  },

  // ==========================================
  // U15 - U16 (Born 2011) MATCH TEMPO, BIOMECHANICS & JUEGO DE POSICIÓN
  // ==========================================
  {
    id: "u15-juego-posicion-7v7",
    title: "7v7+3 Juego de Posición (Positional Mastery)",
    ageGroup: "U15-U16",
    birthYears: "2011",
    category: "tactical_possession",
    categoryLabel: "Positional Play (Tactical)",
    difficulty: "Advanced",
    durationMinutes: 25,
    recommendedSets: 4,
    recommendedReps: 1,
    durationSeconds: 360,
    gridDimensions: "35m x 35m pitch divided into 4 vertical zones",
    equipment: ["Cones for grid and zone lines", "3 sets of colored pinnies", "Balls"],
    summary:
      "Advanced positional grid training line breaking, rotational movements, creating numerical superiority, and finding the 'Free Man'.",
    setup:
      "7 in possession vs 7 defending + 3 neutrals (1 central pivot, 2 wide wingers). Pitch marked with 2 half-spaces and central corridor.",
    instructions: [
      "Team in possession plays with the 3 neutrals (10v7 effective overload).",
      "Tactical rule: No more than 2 players from the same team in any vertical lane at the same time (rotational balance).",
      "Move the opponent by circulating through the central pivot until a passing lane into the opposite half-space opens.",
      "When possession is lost, the pressing team has 8 seconds to transition and attack the target line.",
    ],
    coachingPoints: [
      "Speed of ball circulation: 1-2 touches maximum.",
      "Disguise passes with eyes and body posture.",
      "Recognize when to play backward to draw opponents out, creating space behind.",
      "Constant scanning: know where the third man is before receiving.",
    ],
    variations: [
      "Limit central neutral to 1 touch only.",
      "Point awarded for every line-breaking pass between two defenders.",
    ],
    metricPresetId: "rondo_streak",
  },
  {
    id: "u15-gegenpress-vertical-counter",
    title: "Gegenpress Wave & Rapid Vertical Counter",
    ageGroup: "U15-U16",
    birthYears: "2011",
    category: "defending_pressing",
    categoryLabel: "High Intensity Transition",
    difficulty: "Advanced",
    durationMinutes: 20,
    recommendedSets: 5,
    recommendedReps: 1,
    durationSeconds: 180,
    gridDimensions: "Half pitch (50m x 45m)",
    equipment: ["Full goal with GK", "2 mini goals on halfway line", "Pinnies", "Balls"],
    summary:
      "High-intensity match simulation: Gegenpressing to win the ball in the attacking third and finishing within 3 vertical passes.",
    setup:
      "Attacking team of 6 (3 forwards, 3 midfielders) vs Defending team of 5 (Back 4 + CDM + GK).",
    instructions: [
      "Defending team builds from goalkeeper.",
      "Attacking team executes an aggressive, coordinated high press.",
      "Upon winning the ball, rule: Maximum 3 passes and 8 seconds to get a shot on target.",
      "If defenders break the press and pass into either mini goal, they earn 2 points.",
      "Rotate players every 4 minutes to maintain peak aerobic/anaerobic output.",
    ],
    coachingPoints: [
      "First pass after regaining possession must be forward or vertical into the box.",
      "Forward runners must sprint aggressively into crossing pockets immediately upon turnover.",
      "Extreme physical commitment in the counter-press — high sprint velocities.",
    ],
    variations: [
      "Allow only 6 seconds to shoot after winning the ball.",
    ],
    metricPresetId: "one_v_one_wins",
  },
  {
    id: "u15-cod-deceleration-biomechanics",
    title: "High-Speed Deceleration & COD Biomechanics Course",
    ageGroup: "U15-U16",
    birthYears: "2011",
    category: "agility_speed",
    categoryLabel: "Biomechanics & Injury Prevention",
    difficulty: "Advanced",
    durationMinutes: 18,
    recommendedSets: 4,
    recommendedReps: 4,
    durationSeconds: 150,
    gridDimensions: "25m x 15m athletic channel",
    equipment: ["Agility cones", "Timing gates or stopwatch", "Soccer balls"],
    summary:
      "Focuses on soccer-specific eccentric deceleration mechanics, knee-over-toe alignment, and explosive re-acceleration to reduce ACL injury risk.",
    setup:
      "Set a 15m linear sprint gate, followed by a 45-degree cut cone, a 5m deceleration braking zone, and a technical finish.",
    instructions: [
      "Athlete sprints 100% maximum velocity for 15 meters.",
      "Enters braking zone: drops center of gravity with 3 rhythmic stutter steps, maintaining knee-hip alignment without knee valgus.",
      "Explodes at a 45-degree angle to receive a driven pass from coach.",
      "Controls on the half-turn and delivers a driven strike on goal.",
      "Full 90 seconds recovery between sets for neuromuscular restoration.",
    ],
    coachingPoints: [
      "Deceleration mechanics: sink the hips, do not let chest collapse forward.",
      "Avoid knee cave-in (valgus) on cutting steps — keep knee tracked over second toe.",
      "Pump arms vigorously on the re-acceleration phase.",
    ],
    variations: [
      "Perform with unexpected verbal audio cues (left vs right cut) to train cognitive reaction.",
    ],
    metricPresetId: "pro_agility",
  },
  {
    id: "u15-goalkeeper-distribution-sweeper",
    title: "Goalkeeper Distribution & Sweeper-Keeper Action",
    ageGroup: "U15-U16",
    birthYears: "2011",
    category: "goalkeeping",
    categoryLabel: "Goalkeeping & Build-Up",
    difficulty: "Advanced",
    durationMinutes: 20,
    recommendedSets: 4,
    recommendedReps: 8,
    durationSeconds: 240,
    gridDimensions: "Defensive half (penalty box to center circle)",
    equipment: ["Full goal", "Mannequins", "Cones", "Soccer balls"],
    summary:
      "Trains modern sweeper-keeper positioning high off the line to clear through-balls, followed by precise side-volley and clipped distributions.",
    setup:
      "GK starts 18m out from goal. Coach at center circle. Fullback and winger target gates at the touchlines.",
    instructions: [
      "Coach plays a weighted through-ball behind imaginary high defensive line.",
      "Goalkeeper reads the flight, sprints forward, and executes a clean first-time clearance or cushioned pass to teammate.",
      "Immediately retreats to goal line, resets stance.",
      "Coach delivers a fast back-pass: GK must receive under pressure and hit a 40m side-volley or driven clipped pass into wide target gates.",
    ],
    coachingPoints: [
      "Starting position must be dynamic: adjust position as the ball moves forward.",
      "Clear communication with defense: loud, decisive shout 'KEEPER' or 'AWAY'.",
      "Side-volley technique: open shoulders, slice through ball for flat trajectory that arrives at chest height for wide winger.",
    ],
    variations: [
      "Add an active attacking forward sprinting to intercept the back-pass.",
    ],
    metricPresetId: "passing_accuracy",
  },
];

export const BUILTIN_DRILL_BENCHMARKS: Record<
  string,
  {
    metric: string;
    unit: string;
    benchmark: number;
    lowerBetter: boolean;
    attr: "Speed" | "Power" | "Agility" | "Strength" | "Endurance" | "Mobility" | "Technical" | "Tactical";
  }
> = {
  "u6-toe-tap-castle": {
    metric: "Toe-Tap Speed (touches / 30s)",
    unit: "touches",
    benchmark: 35,
    lowerBetter: false,
    attr: "Technical",
  },
  "u6-sharks-and-minnows": {
    metric: "Evasion Agility (survival sec)",
    unit: "s",
    benchmark: 45,
    lowerBetter: false,
    attr: "Agility",
  },
  "u6-pirate-treasure-gates": {
    metric: "Gate Dribbles (gates / 60s)",
    unit: "gates",
    benchmark: 8,
    lowerBetter: false,
    attr: "Technical",
  },
  "u6-red-light-green-light": {
    metric: "Stop-Go Reaction (s)",
    unit: "s",
    benchmark: 1.2,
    lowerBetter: true,
    attr: "Agility",
  },
  "u9-cruyff-stepover-box": {
    metric: "1v1 Move Execution (moves / min)",
    unit: "moves",
    benchmark: 12,
    lowerBetter: false,
    attr: "Technical",
  },
  "u9-3v1-triangle-rondo": {
    metric: "3v1 Rondo Pass Streak",
    unit: "passes",
    benchmark: 15,
    lowerBetter: false,
    attr: "Tactical",
  },
  "u9-cone-slalom-laces-strike": {
    metric: "Slalom & Strike Precision (pts / 5)",
    unit: "pts",
    benchmark: 4,
    lowerBetter: false,
    attr: "Power",
  },
  "u9-four-corner-back-foot": {
    metric: "Back-Foot Receive Speed (s)",
    unit: "s",
    benchmark: 22.0,
    lowerBetter: true,
    attr: "Technical",
  },
  "u11-4v2-transition-rondo": {
    metric: "4v2 Rondo Pass Streak",
    unit: "passes",
    benchmark: 20,
    lowerBetter: false,
    attr: "Tactical",
  },
  "u11-winger-overlap-cross": {
    metric: "Cross Delivery Accuracy (%)",
    unit: "%",
    benchmark: 70,
    lowerBetter: false,
    attr: "Technical",
  },
  "u11-aerial-cushion-touch": {
    metric: "Aerial First Touch Box (made / 10)",
    unit: "made",
    benchmark: 8,
    lowerBetter: false,
    attr: "Technical",
  },
  "u11-illinois-soccer-agility": {
    metric: "Illinois Soccer Agility Test",
    unit: "s",
    benchmark: 16.5,
    lowerBetter: true,
    attr: "Agility",
  },
  "u13-5v5-positional-possession": {
    metric: "5v5 Possession Retention (%)",
    unit: "%",
    benchmark: 65,
    lowerBetter: false,
    attr: "Tactical",
  },
  "u13-high-pressing-triggers": {
    metric: "Pressing Turnover Rate (turnovers / 5m)",
    unit: "turnovers",
    benchmark: 5,
    lowerBetter: false,
    attr: "Tactical",
  },
  "u13-diagonal-switch-cutback": {
    metric: "Switch & Cutback Conversion (goals / 10)",
    unit: "goals",
    benchmark: 6,
    lowerBetter: false,
    attr: "Power",
  },
  "u13-rapid-counter-press-5sec": {
    metric: "5-Second Counter-Press Recovery (s)",
    unit: "s",
    benchmark: 4.2,
    lowerBetter: true,
    attr: "Speed",
  },
  "u15-juego-posicion-7v7": {
    metric: "7v7 Positional Third Entry (%)",
    unit: "%",
    benchmark: 75,
    lowerBetter: false,
    attr: "Tactical",
  },
  "u15-gegenpress-vertical-counter": {
    metric: "Gegenpress Vertical Transition (s)",
    unit: "s",
    benchmark: 6.8,
    lowerBetter: true,
    attr: "Speed",
  },
  "u15-cod-deceleration-biomechanics": {
    metric: "Change of Direction Decel (s)",
    unit: "s",
    benchmark: 4.8,
    lowerBetter: true,
    attr: "Agility",
  },
  "u15-goalkeeper-distribution-sweeper": {
    metric: "GK Sweeper Distribution Accuracy (%)",
    unit: "%",
    benchmark: 80,
    lowerBetter: false,
    attr: "Technical",
  },
};

/**
 * Returns the standardized metric name, unit, target benchmark, direction,
 * and athletic radar attribute for any drill.
 */
export function getDrillMetricSpec(drill: SoccerDrill): {
  metricName: string;
  metricUnit: string;
  benchmark: number;
  isLowerBetter: boolean;
  targetAttribute: "Speed" | "Power" | "Agility" | "Strength" | "Endurance" | "Mobility" | "Technical" | "Tactical";
} {
  const lookup = BUILTIN_DRILL_BENCHMARKS[drill.id];
  return {
    metricName: drill.metricName || lookup?.metric || drill.title,
    metricUnit: drill.metricUnit || lookup?.unit || "pts",
    benchmark: drill.benchmark ?? lookup?.benchmark ?? 10,
    isLowerBetter: drill.isLowerBetter ?? lookup?.lowerBetter ?? false,
    targetAttribute: drill.targetAttribute || lookup?.attr || "Technical",
  };
}

/**
 * Combines built-in soccer drills with custom drills created by coaches.
 */
export function combineAllDrills(
  builtInDrills: SoccerDrill[] = SOCCER_DRILLS,
  customDrills?: Array<Record<string, unknown>>,
): SoccerDrill[] {
  if (!customDrills || customDrills.length === 0) return builtInDrills;

  const normalizedCustom: SoccerDrill[] = customDrills.map((cd) => {
    const id = (cd._id as string) || (cd.id as string) || `custom_${Date.now()}`;
    const title = (cd.title as string) || "Custom Drill";
    const durationMinutes = Number(cd.durationMinutes) || 15;
    return {
      id,
      title,
      ageGroup: (cd.ageGroup as SoccerDrill["ageGroup"]) || "All U16",
      birthYears: (cd.birthYears as string) || "2011–2020",
      category: (cd.category as SoccerDrill["category"]) || "ball_mastery",
      categoryLabel: (cd.categoryLabel as string) || "Ball Mastery & 1v1",
      difficulty: (cd.difficulty as SoccerDrill["difficulty"]) || "Intermediate",
      durationMinutes,
      durationSeconds: Number(cd.durationSeconds) || durationMinutes * 60,
      recommendedSets: Number(cd.recommendedSets) || 4,
      recommendedReps: Number(cd.recommendedReps) || 6,
      gridDimensions: (cd.gridDimensions as string) || "20m x 20m grid",
      equipment: Array.isArray(cd.equipment) ? (cd.equipment as string[]) : ["Soccer balls", "Cones"],
      summary: (cd.summary as string) || "",
      setup: (cd.setup as string) || "",
      instructions: Array.isArray(cd.instructions) ? (cd.instructions as string[]) : [String(cd.instructions || "")],
      coachingPoints: Array.isArray(cd.coachingPoints) ? (cd.coachingPoints as string[]) : [String(cd.coachingPoints || "")],
      variations: Array.isArray(cd.variations) ? (cd.variations as string[]) : [],
      metricName: (cd.metricName as string) || title,
      metricUnit: (cd.metricUnit as string) || "pts",
      benchmark: typeof cd.benchmark === "number" ? cd.benchmark : 10,
      isLowerBetter: Boolean(cd.isLowerBetter),
      targetAttribute: (cd.targetAttribute as SoccerDrill["targetAttribute"]) || "Technical",
      isCustom: true,
      academyId: cd.academyId as string | undefined,
      createdBy: cd.createdBy as string | undefined,
      createdByName: cd.createdByName as string | undefined,
      createdByRole: cd.createdByRole as string | undefined,
      createdAt: cd.createdAt as string | undefined,
    };
  });

  return [...normalizedCustom, ...builtInDrills];
}

