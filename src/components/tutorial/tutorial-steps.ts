import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Shield,
  UserRound,
  Compass,
  Target,
  Calendar,
  Activity,
  Video,
  MessageSquare,
  Megaphone,
  DollarSign,
} from "lucide-react";

export interface TutorialStep {
  id: string;
  stepNumber: number;
  title: string;
  pageName: string;
  route: string;
  category: "Operations" | "Tactics & Coaching" | "Communication" | "Finance";
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  responsibilities: string[];
  capabilities: string[];
  adminTip: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    stepNumber: 1,
    title: "Welcome to CoachTactics",
    pageName: "Platform Introduction",
    route: "/",
    category: "Operations",
    icon: GraduationCap,
    summary:
      "CoachTactics is your unified soccer operations platform. As an Academy Admin, you hold master control over club squads, coaching staff, pitch schedules, tactical knowledge, communications, and finances.",
    responsibilities: [
      "Overseeing high-level academy rosters and coaching assignments",
      "Scheduling pitches and tracking athlete session attendance",
      "Providing your coaching staff with 2D pitch tools and AI drill generation",
      "Automating monthly membership dues and issuing branded academy invoices",
    ],
    capabilities: [
      "Multi-role user management (Platform Admin, Academy Admin, Coach, Athlete, Parent)",
      "Real-time operational dashboard with critical metrics",
      "Integrated tablet check-in kiosk for facility entrances",
      "Interactive 2D soccer tactical board with phase animations",
    ],
    adminTip:
      "Take this 5-minute guided walkthrough to master every section. You can return to this tutorial anytime by clicking 'Admin Guide' in the top header.",
  },
  {
    id: "overview",
    stepNumber: 2,
    title: "Overview Dashboard",
    pageName: "Overview & Pulse",
    route: "/",
    category: "Operations",
    icon: LayoutDashboard,
    summary:
      "The Overview page is your daily command center. It highlights academy KPIs, live attendance metrics, upcoming sessions, and critical notices requiring your immediate attention.",
    responsibilities: [
      "Reviewing the morning club pulse before training sessions start",
      "Checking the Attendance Leaderboard to identify squads with attendance drops",
      "Broadcasting or checking urgent notice banners (weather cancellations, pitch moves)",
    ],
    capabilities: [
      "Live KPI cards: Active athletes, squads, upcoming sessions, and active training plans",
      "Urgent Noticeboard banner pinned at the very top for fast incident awareness",
      "Today's and upcoming sessions list with direct links to roster attendance sheets",
      "Squad attendance leaderboard comparing monthly participation rates",
    ],
    adminTip:
      "Start each training day by scanning the Overview page to ensure all pitches have assigned coaches and that no scheduling conflicts exist.",
  },
  {
    id: "staff",
    stepNumber: 3,
    title: "Staff & Coaches Directory",
    pageName: "Staff Management",
    route: "/staff",
    category: "Operations",
    icon: Users,
    summary:
      "Manage all coaches, assistant coaches, and accounting officers in your academy. Send secure email invites and assign role-based access permissions.",
    responsibilities: [
      "Inviting new coaches and staff members with specific role permissions",
      "Revoking or updating staff credentials when personnel changes occur",
      "Monitoring pending invites and tracking staff onboarding status",
    ],
    capabilities: [
      "Instant email invitations with role selection (Coach, Assistant, Accounting)",
      "Active staff directory with contact emails and assignment status",
      "Pending invitations queue with resend and cancellation controls",
      "Clear separation of privileges: Coaches access tactics/rosters, while accounting accesses finances",
    ],
    adminTip:
      "Always onboard new coaches with the 'Coach' role so they can immediately begin designing drills, planning sessions, and taking attendance for their squads.",
  },
  {
    id: "teams",
    stepNumber: 4,
    title: "Teams & Age-Group Squads",
    pageName: "Squads & Teams",
    route: "/teams",
    category: "Operations",
    icon: Shield,
    summary:
      "Create and structure your academy's squads (e.g. U-10 Development, U-12 Academy, U-15 Elite, First Team). Assign dedicated coaches and manage roster capacities.",
    responsibilities: [
      "Defining age categories, squad names, and target team sizes",
      "Assigning Head Coaches and Assistant Coaches to oversee each squad",
      "Reviewing squad member counts, practice schedules, and squad statistics",
    ],
    capabilities: [
      "Create squads with custom names, sport tags, and designated coach leaders",
      "Direct squad roster views with player jersey numbers and positions",
      "Quick link into squad-specific training schedules and team message channels",
      "Roster balance monitoring to prevent overcrowded or under-staffed teams",
    ],
    adminTip:
      "Keep squad rosters accurate before generating monthly recurring fee batches to ensure that every active player is billed the proper squad rate.",
  },
  {
    id: "athletes",
    stepNumber: 5,
    title: "Athletes Directory & Roster",
    pageName: "Athletes Database",
    route: "/athletes",
    category: "Operations",
    icon: UserRound,
    summary:
      "Maintain a centralized roster database containing player positions, jersey numbers, birth dates, guardian contact info, and emergency medical notes.",
    responsibilities: [
      "Registering new players and assigning them to their respective age squads",
      "Linking guardian/parent emails to enable automatic invoice delivery and alerts",
      "Logging critical medical flags, allergies, and emergency contact phone numbers",
    ],
    capabilities: [
      "Add and edit athletes with jersey numbers, birth dates, and primary foot",
      "Filter athletes by squad, position (Goalkeeper, Defender, Midfielder, Forward), or name",
      "Guardian relationship linking for multi-child family accounts",
      "Emergency medical notes badge visible on coaching sheets during field emergencies",
    ],
    adminTip:
      "Ensure guardian emails are filled in for each youth player so parents automatically receive billing statements and training notifications.",
  },
  {
    id: "tactical-board",
    stepNumber: 6,
    title: "Interactive Tactical Board",
    pageName: "2D Soccer Tactical Board",
    route: "/tactical-board",
    category: "Tactics & Coaching",
    icon: Compass,
    summary:
      "The flagship tactical board provides a professional 2D soccer pitch simulation for tactical planning, match briefs, phase transitions, and player animations.",
    responsibilities: [
      "Ensuring coaches have access to digital tactical tools rather than static magnetic whiteboards",
      "Reviewing and approving club tactical frameworks, formations, and set-piece routines",
      "Exporting match tactical plans for pre-game locker room presentations",
    ],
    capabilities: [
      "Interactive 2D pitch with full pitch, half pitch, and penalty box viewports",
      "Drag-and-drop player tokens with home (red) and away (blue) kits and jersey numbers",
      "Ball positioning, passing trajectory, and dribble path drawing",
      "Tactical annotations: Straight passes, curved runs, pressing zones, and shading cones",
      "Multi-phase keyframe animation: Record Phase 1, Phase 2, Phase 3 and press Play to replay movements",
      "High-resolution pitch image exports for match briefs and drill handouts",
    ],
    adminTip:
      "Encourage your coaching staff to build standardized set-piece routines on the Tactical Board so substitute coaches can seamlessly execute the same match tactics.",
  },
  {
    id: "drills",
    stepNumber: 7,
    title: "Soccer Drills & AI Designer",
    pageName: "Drills & AI Playbook",
    route: "/drills",
    category: "Tactics & Coaching",
    icon: Target,
    summary:
      "Access a curated soccer drill library and leverage the AI Tactical Synthesis Engine to automatically generate age-appropriate tactical training drills.",
    responsibilities: [
      "Curating an academy-wide drill playbook aligned with your club's soccer philosophy",
      "Using the AI Drill Designer to create fresh session variations based on specific coaching objectives",
      "Tracking athlete performance and metric scoring across repeatable drills",
    ],
    capabilities: [
      "Searchable drill library filtered by category: Passing, Pressing, Finishing, Set Pieces, Counter-Attack",
      "AI Drill Designer: Input coaching focus and constraints to generate structured drill setups, rules, and coaching points",
      "Launch onto Tactical Board: Open any drill directly on the 2D pitch with pre-positioned players",
      "Drill analytics and assessment scoring to evaluate technical player benchmarks",
    ],
    adminTip:
      "All AI-generated drills pass through domain validation to guarantee pitch coordinate safety, realistic player spacing, and soccer coaching accuracy.",
  },
  {
    id: "schedule",
    stepNumber: 8,
    title: "Training Schedule & Attendance",
    pageName: "Calendar & Sessions",
    route: "/schedule",
    category: "Operations",
    icon: Calendar,
    summary:
      "The master schedule coordinates all pitch allocations, training sessions, friendly games, and attendance sheets across your academy squads.",
    responsibilities: [
      "Scheduling recurring and one-off training sessions with pitch and coach assignments",
      "Resolving pitch booking conflicts between competing age groups",
      "Ensuring coaches log daily player attendance and training readiness ratings",
    ],
    capabilities: [
      "Calendar view across month, week, and day modes with squad color filters",
      "Create session dialog specifying squad, location/field, start/end time, and lead coach",
      "Interactive attendance sheet to mark athletes Present, Late, Excused, or Absent",
      "Player readiness and session intensity tracking for workload management",
    ],
    adminTip:
      "Filter the master calendar by squad or pitch to identify open field slots for specialized goalkeeper training or tactical video sessions.",
  },
  {
    id: "kiosk",
    stepNumber: 9,
    title: "Tablet Entrance Kiosk Mode",
    pageName: "Touch Check-In Kiosk",
    route: "/kiosk",
    category: "Operations",
    icon: Activity,
    summary:
      "A touch-friendly, high-contrast kiosk mode designed for iPads and tablets placed at your training facility entrance for self-service athlete check-in.",
    responsibilities: [
      "Setting up entrance tablets before athletes arrive for afternoon practice",
      "Enabling touch-based check-in to eliminate manual paper sign-in sheets",
      "Reviewing real-time arrival logs as players arrive at the pitch",
    ],
    capabilities: [
      "Large touch targets and sunlight-friendly high contrast for outdoor tablet usage",
      "Instant search by player name or jersey number for 2-second check-in",
      "Auditory chime confirmation when an athlete signs into today's session",
      "Offline sync safety: Queues check-ins locally if pitch Wi-Fi flickers and syncs when restored",
    ],
    adminTip:
      "Lock your tablet in Fullscreen mode (or iPad Guided Access) so players can quickly tap their names to check in without accidentally leaving the applet.",
  },
  {
    id: "video-hub",
    stepNumber: 10,
    title: "Video Hub & Match Breakdown",
    pageName: "Video Analysis",
    route: "/video-hub",
    category: "Tactics & Coaching",
    icon: Video,
    summary:
      "Review match footage, tag tactical moments, draw on freeze frames, and provide visual feedback to squads and individual athletes.",
    responsibilities: [
      "Hosting match game tape and training highlight clips in one central repository",
      "Empowering coaches to conduct video review sessions with visual diagrams",
      "Sharing clip timestamps with players for home self-review",
    ],
    capabilities: [
      "Match video library with squad and player filter tags",
      "Visual freeze-frame drawing overlays (arrows, lines, spatial circles)",
      "Time-stamped coaching notes linking tactical principles to real match footage",
      "Player review portal where athletes can study their assigned video feedback",
    ],
    adminTip:
      "Tag specific athlete profiles in video timestamps so that relevant clips automatically appear on their athlete development card.",
  },
  {
    id: "messages",
    stepNumber: 11,
    title: "Direct Messages & Team Comms",
    pageName: "Academy Messaging",
    route: "/messages",
    category: "Communication",
    icon: MessageSquare,
    summary:
      "Real-time communication channels between coaches, administrators, athletes, and guardians for seamless club coordination.",
    responsibilities: [
      "Communicating privately with parents regarding player development or billing",
      "Coordinating squad logistics (bus departures, tournament travel, jersey colors)",
      "Maintaining professional, centralized club communication within one app",
    ],
    capabilities: [
      "1-on-1 direct messaging and squad-wide group chat channels",
      "Contextual tags: Attach a message to a specific training session or tactical drill",
      "Real-time delivery with unread counters and read indicators",
      "Fast recipient search across all academy coaches, parents, and athletes",
    ],
    adminTip:
      "Use Direct Messages for sensitive matters (e.g. medical updates or billing inquiries) and use the Noticeboard for academy-wide announcements.",
  },
  {
    id: "announcements",
    stepNumber: 12,
    title: "Noticeboard & Announcements",
    pageName: "Official Noticeboard",
    route: "/announcements",
    category: "Communication",
    icon: Megaphone,
    summary:
      "Broadcast official academy news, tournament schedules, registration deadlines, and urgent weather alerts across the entire club.",
    responsibilities: [
      "Publishing club-wide news and event announcements",
      "Issuing high-priority weather cancellation notices that pin to the dashboard",
      "Tracking read receipts to confirm families have seen crucial updates",
    ],
    capabilities: [
      "Priority levels: Normal, Important, and Urgent",
      "Urgent announcements automatically highlight in an amber alert banner on the Overview page",
      "Audience targeting: Send to the entire academy or target specific squads",
      "Pinning capability to keep critical notices at the top of the feed",
    ],
    adminTip:
      "Mark weather rainouts or pitch changes as 'Urgent' so the alert banner immediately appears on everyone's dashboard upon opening the app.",
  },
  {
    id: "finance",
    stepNumber: 13,
    title: "Fees, Invoices & Automated Billing",
    pageName: "Financial Management",
    route: "/finance",
    category: "Finance",
    icon: DollarSign,
    summary:
      "Manage academy cashflow, track fee payments, automate recurring monthly subscriptions, and generate professional branded invoices.",
    responsibilities: [
      "Setting up automated monthly fee schedules for each squad or membership tier",
      "Recording incoming payments (Credit Card, Bank Transfer, Cash) and issuing receipts",
      "Monitoring overdue accounts and generating branded invoices on `/invoices`",
    ],
    capabilities: [
      "Automated Monthly Fee Schedules: System generates fee batches each month automatically",
      "Live financial summary: Total revenue collected, pending payments, and overdue balances",
      "Invoice Generator (`/invoices`): Issue formal invoices with academy branding, line items, and due dates",
      "Payment status tracking: Filter invoices by Draft, Sent, Paid, and Overdue",
    ],
    adminTip:
      "Enable 'Recurring monthly fees' on `/finance` to eliminate hours of manual billing each month. Invoices can also be sent directly to parent emails.",
  },
];

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  route: string;
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "invite_staff",
    title: "1. Invite Coaching & Accounting Staff",
    description: "Onboard your assistant coaches and finance officers with role-based access.",
    route: "/staff",
  },
  {
    id: "create_teams",
    title: "2. Set Up Squads & Age Categories",
    description: "Create your U-10, U-12, U-15 or Senior squads and assign head coaches.",
    route: "/teams",
  },
  {
    id: "add_athletes",
    title: "3. Register Athletes & Link Guardians",
    description: "Add players with jersey numbers and link guardian emails for billing/alerts.",
    route: "/athletes",
  },
  {
    id: "schedule_session",
    title: "4. Schedule Your First Training Session",
    description: "Book pitch times, assign squads, and test the attendance check-in sheet.",
    route: "/schedule",
  },
  {
    id: "explore_tactics",
    title: "5. Try the 2D Tactical Board & AI Drills",
    description: "Open the tactical pitch and generate a custom drill with the AI designer.",
    route: "/tactical-board",
  },
  {
    id: "configure_fees",
    title: "6. Configure Monthly Fee Schedules",
    description: "Set up automated recurring monthly fee schedules to automate club billing.",
    route: "/finance",
  },
];
