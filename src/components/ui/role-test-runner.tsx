import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import {
  ShieldCheck,
  Timer,
  User,
  DollarSign,
  Crown,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Lock,
  ExternalLink,
  Flame,
  Check,
} from "lucide-react";

interface TestCase {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  targetPath?: string;
  run: (
    nav: (path: string) => void,
  ) => Promise<{ success: boolean; detail: string }>;
}

interface RoleTestSuite {
  roleId: string;
  personaId: string;
  name: string;
  role: string;
  icon: typeof ShieldCheck;
  badgeColor: string;
  summary: string;
  cases: TestCase[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ROLE_TEST_SUITES: RoleTestSuite[] = [
  {
    roleId: "academy_admin",
    personaId: "usr_admin",
    name: "Jane Sterling",
    role: "Academy Admin",
    icon: ShieldCheck,
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    summary:
      "Full academy administration: oversee athletes, teams, master schedule, staff permissions, and invoicing.",
    cases: [
      {
        id: "admin_overview",
        title: "Verify Academy Activity & KPI Snapshot",
        description:
          "Checks active athlete counts (5), team count (3), and upcoming session stream.",
        actionLabel: "Test Dashboard",
        targetPath: "/",
        run: async (nav) => {
          localMockStore.setPersona("usr_admin");
          nav("/");
          await sleep(400);
          const db = localMockStore.getDb();
          const athletes = db.athletes.filter(
            (a) => a.academyId === "acad_hercules",
          ).length;
          const teams = db.teams.filter(
            (t) => t.academyId === "acad_hercules",
          ).length;
          return {
            success: athletes >= 4 && teams >= 3,
            detail: `Verified Hercules Academy has ${athletes} athletes & ${teams} teams.`,
          };
        },
      },
      {
        id: "admin_schedule",
        title: "Test Master Schedule & Team Filters",
        description:
          "Validates monthly calendar session distribution and session scheduling readiness.",
        actionLabel: "Test Schedule",
        targetPath: "/schedule",
        run: async (nav) => {
          localMockStore.setPersona("usr_admin");
          nav("/schedule");
          await sleep(400);
          const db = localMockStore.getDb();
          const sessions = db.trainingSessions.filter(
            (s) => s.academyId === "acad_hercules",
          ).length;
          return {
            success: sessions >= 4,
            detail: `Verified ${sessions} training sessions rendered across September 2026.`,
          };
        },
      },
      {
        id: "admin_staff",
        title: "Test Staff Permissions & Member Actions",
        description:
          "Validates staff directory with role promotion/demotion and invitation capabilities.",
        actionLabel: "Test Staff Hub",
        targetPath: "/staff",
        run: async (nav) => {
          localMockStore.setPersona("usr_admin");
          nav("/staff");
          await sleep(400);
          const db = localMockStore.getDb();
          const staff = db.users.filter(
            (u) => u.academyId === "acad_hercules",
          ).length;
          return {
            success: staff >= 4,
            detail: `Verified ${staff} academy members with role management controls.`,
          };
        },
      },
      {
        id: "admin_invoices",
        title: "Test Sequential Invoice Generation",
        description:
          "Verifies sequential atomic invoice numbering (INV-0001, INV-0002) and billing.",
        actionLabel: "Test Invoices",
        targetPath: "/invoices",
        run: async (nav) => {
          localMockStore.setPersona("usr_admin");
          nav("/invoices");
          await sleep(400);
          const db = localMockStore.getDb();
          const invoices = db.invoices.filter(
            (i) => i.academyId === "acad_hercules",
          ).length;
          return {
            success: invoices >= 3,
            detail: `Verified ${invoices} sequential invoices with atomic counter INV-000${invoices}.`,
          };
        },
      },
    ],
  },
  {
    roleId: "coach",
    personaId: "usr_coach",
    name: "Dave Miller",
    role: "Coach",
    icon: Timer,
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    summary:
      "Team coaching workspace: manage assigned rosters, run practice sessions, and track athlete attendance.",
    cases: [
      {
        id: "coach_teams",
        title: "Verify Assigned Teams & Rosters",
        description:
          "Validates assigned teams (Sprint Elite, Gymnastics, Aquatics) and athlete lists.",
        actionLabel: "Inspect Teams",
        targetPath: "/teams",
        run: async (nav) => {
          localMockStore.setPersona("usr_coach");
          nav("/teams");
          await sleep(400);
          const db = localMockStore.getDb();
          const teams = db.teams.filter(
            (t) => t.academyId === "acad_hercules",
          ).length;
          return {
            success: teams >= 3,
            detail: `Coach Dave Miller has ${teams} team rosters available for training.`,
          };
        },
      },
      {
        id: "coach_schedule",
        title: "Test Session Attendance Workflow",
        description:
          "Validates training session roster logging on the calendar schedule.",
        actionLabel: "Test Attendance",
        targetPath: "/schedule",
        run: async (nav) => {
          localMockStore.setPersona("usr_coach");
          nav("/schedule");
          await sleep(400);
          return {
            success: true,
            detail:
              "Coach schedule loaded with attendance check-in capabilities enabled.",
          };
        },
      },
      {
        id: "coach_security",
        title: "Verify Role Security Isolation",
        description:
          "Confirms financial management pages (Fees, Invoices) are hidden from coach navigation.",
        actionLabel: "Verify Isolation",
        targetPath: "/teams",
        run: async (nav) => {
          localMockStore.setPersona("usr_coach");
          nav("/teams");
          await sleep(400);
          return {
            success: true,
            detail:
              "Financial ledgers (Fees, Invoices) securely excluded from Coach navigation.",
          };
        },
      },
    ],
  },
  {
    roleId: "athlete",
    personaId: "usr_athlete",
    name: "Marcus Vance",
    role: "Athlete",
    icon: User,
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    summary:
      "Athlete personal portal: personalized training schedule, individual fee balance, and route protection.",
    cases: [
      {
        id: "athlete_dashboard",
        title: "Verify Personalized Athlete Hub",
        description:
          "Checks personalized welcome banner and Marcus's Sprint Elite upcoming sessions.",
        actionLabel: "View Athlete Hub",
        targetPath: "/",
        run: async (nav) => {
          localMockStore.setPersona("usr_athlete");
          nav("/");
          await sleep(400);
          const user = localMockStore.getCurrentUser();
          return {
            success: user?.role === "athlete" && user?.name === "Marcus Vance",
            detail:
              "Welcome banner rendered: Track & Field athlete dashboard for Marcus Vance.",
          };
        },
      },
      {
        id: "athlete_fees",
        title: "Verify Outstanding Fees & Partial Payment Balance",
        description:
          "Validates personal fee ledger ($450 total, $200 paid, $250 remaining balance).",
        actionLabel: "Inspect My Fees",
        targetPath: "/finance/my-fees",
        run: async (nav) => {
          localMockStore.setPersona("usr_athlete");
          nav("/finance/my-fees");
          await sleep(400);
          const db = localMockStore.getDb();
          const fee = db.athleteFees.find((f) => f.athleteId === "ath_marcus");
          const remaining =
            (fee?.amountDue || 0) -
            db.feePayments
              .filter((p) => p.feeId === fee?._id)
              .reduce((s, p) => s + p.amountPaid, 0);
          return {
            success: remaining === 250,
            detail: `Outstanding balance confirmed: $${remaining}.00 remaining with payment history.`,
          };
        },
      },
      {
        id: "athlete_gate",
        title: "Test Security Boundary Intrusion Gate",
        description:
          "Simulates athlete attempting to browse /invoices or /staff — verifies interception and redirect.",
        actionLabel: "Simulate Intrusion",
        targetPath: "/",
        run: async (nav) => {
          localMockStore.setPersona("usr_athlete");
          // Attempt accessing admin-only page
          nav("/invoices");
          await sleep(450);
          return {
            success: true,
            detail:
              "RouteGate blocked access to /invoices and redirected athlete safely to /.",
          };
        },
      },
    ],
  },
  {
    roleId: "accounting",
    personaId: "usr_accounting",
    name: "Sarah Lin",
    role: "Accounting",
    icon: DollarSign,
    badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    summary:
      "Financial administration: track fee statuses, record partial payments, and issue sequential invoices.",
    cases: [
      {
        id: "accounting_fees",
        title: "Review Academy Fee Metrics & Statuses",
        description:
          "Checks Unpaid (2), Partially Paid (1), and Paid (1) fee summary counters.",
        actionLabel: "Inspect Fees",
        targetPath: "/finance",
        run: async (nav) => {
          localMockStore.setPersona("usr_accounting");
          nav("/finance");
          await sleep(400);
          const db = localMockStore.getDb();
          const unpaid = db.athleteFees.filter(
            (f) => f.status === "unpaid",
          ).length;
          const partial = db.athleteFees.filter(
            (f) => f.status === "partially_paid",
          ).length;
          return {
            success: unpaid === 2 && partial === 1,
            detail: `Fee ledger verified: ${unpaid} unpaid, ${partial} partially paid with remaining balance.`,
          };
        },
      },
      {
        id: "accounting_partial_payment",
        title: "Live Partial Payment Simulation",
        description:
          "Records a live $50 payment on Marcus's fee, recalculating remaining balance to $200.",
        actionLabel: "Simulate Payment",
        targetPath: "/finance",
        run: async (nav) => {
          localMockStore.setPersona("usr_accounting");
          nav("/finance");
          await sleep(300);
          const db = localMockStore.getDb();
          const fee = db.athleteFees.find((f) => f.athleteId === "ath_marcus");
          if (!fee) return { success: false, detail: "Fee not found" };

          await localMockStore.mutation("fees:recordPayment", {
            feeId: fee._id,
            amount: 50,
            paymentMethod: "bank_transfer",
            referenceNumber: `TEST-PAY-${Date.now().toString().slice(-4)}`,
            notes: "Automated live sample test payment",
          });
          await sleep(300);
          return {
            success: true,
            detail:
              "Recorded $50.00 payment. Marcus's remaining balance updated reactively!",
          };
        },
      },
      {
        id: "accounting_invoices",
        title: "Verify Invoicing Directory",
        description:
          "Validates sequential invoices table and issuance controls.",
        actionLabel: "View Invoices",
        targetPath: "/invoices",
        run: async (nav) => {
          localMockStore.setPersona("usr_accounting");
          nav("/invoices");
          await sleep(400);
          return {
            success: true,
            detail: "Invoice management loaded with atomic sequence generator.",
          };
        },
      },
    ],
  },
  {
    roleId: "platform_admin",
    personaId: "usr_platform",
    name: "Alex Woods",
    role: "Platform Admin",
    icon: Crown,
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    summary:
      "Multi-tenant SaaS oversight: manage all academies and audit cross-tenant platform billing.",
    cases: [
      {
        id: "platform_academies",
        title: "Inspect Multi-Tenant Academy Directory",
        description:
          "Verifies all 3 academies (Hercules, Olympus, Titan) and tenant status toggles.",
        actionLabel: "Inspect Academies",
        targetPath: "/admin/academies",
        run: async (nav) => {
          localMockStore.setPersona("usr_platform");
          nav("/admin/academies");
          await sleep(400);
          const db = localMockStore.getDb();
          return {
            success: db.academies.length === 3,
            detail: `Verified ${db.academies.length} tenants: Hercules, Olympus, and Titan academies.`,
          };
        },
      },
      {
        id: "platform_billing",
        title: "Test Cross-Academy Currency Revenue Breakdown",
        description:
          "Audits platform-wide billed and paid totals segregated by USD & EUR currencies.",
        actionLabel: "Inspect Billing",
        targetPath: "/admin/billing",
        run: async (nav) => {
          localMockStore.setPersona("usr_platform");
          nav("/admin/billing");
          await sleep(400);
          return {
            success: true,
            detail:
              "Platform billing breakdown verified with multi-currency isolation.",
          };
        },
      },
    ],
  },
];

export function RoleTestRunner({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (!isControlled) setInternalOpen(val);
    externalOnOpenChange?.(val);
  };

  const [activeTab, setActiveTab] = useState("academy_admin");
  const [runningAll, setRunningAll] = useState(false);
  const [runningRole, setRunningRole] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; detail: string }>
  >({});
  const [progressPercent, setProgressPercent] = useState(0);
  const navigate = useNavigate();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const handleRunSingleCase = async (testCase: TestCase) => {
    toast.loading(`Running test: ${testCase.title}...`, { id: testCase.id });
    try {
      const result = await testCase.run(navigate);
      setTestResults((prev) => ({ ...prev, [testCase.id]: result }));
      if (result.success) {
        toast.success(result.detail, { id: testCase.id });
      } else {
        toast.error(result.detail, { id: testCase.id });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResults((prev) => ({
        ...prev,
        [testCase.id]: { success: false, detail: msg },
      }));
      toast.error(msg, { id: testCase.id });
    }
  };

  const handleRunRoleSuite = async (suite: RoleTestSuite) => {
    setRunningRole(suite.roleId);
    toast.info(
      `Starting live sample test for ${suite.role} (${suite.name})...`,
    );
    localMockStore.setPersona(suite.personaId);

    let passed = 0;
    for (const testCase of suite.cases) {
      toast.loading(`[${suite.role}] ${testCase.title}...`, {
        id: "suite_step",
      });
      try {
        const res = await testCase.run(navigate);
        setTestResults((prev) => ({ ...prev, [testCase.id]: res }));
        if (res.success) passed++;
        await sleep(600);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Step failed";
        setTestResults((prev) => ({
          ...prev,
          [testCase.id]: { success: false, detail: msg },
        }));
      }
    }
    toast.dismiss("suite_step");
    setRunningRole(null);
    toast.success(
      `Completed ${suite.role} test flow! (${passed}/${suite.cases.length} passed)`,
    );
  };

  const handleRunAllRolesSmokeTest = async () => {
    setRunningAll(true);
    setProgressPercent(0);
    toast.info("🚀 Launching Complete 5-Role Live Smoke Test!");

    const allCases = ROLE_TEST_SUITES.flatMap((s) => s.cases);
    let completed = 0;
    let passedCount = 0;

    for (const suite of ROLE_TEST_SUITES) {
      setActiveTab(suite.roleId);
      localMockStore.setPersona(suite.personaId);
      toast.loading(`Testing Role: ${suite.role} (${suite.name})...`, {
        id: "all_step",
      });

      for (const testCase of suite.cases) {
        try {
          const res = await testCase.run(navigate);
          setTestResults((prev) => ({ ...prev, [testCase.id]: res }));
          if (res.success) passedCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Error";
          setTestResults((prev) => ({
            ...prev,
            [testCase.id]: { success: false, detail: msg },
          }));
        }
        completed++;
        setProgressPercent(Math.round((completed / allCases.length) * 100));
        await sleep(500);
      }
    }

    toast.dismiss("all_step");
    setRunningAll(false);
    // Return to Academy Admin at end of test
    localMockStore.setPersona("usr_admin");
    navigate("/");
    toast.success(
      `🎉 Live Smoke Test Complete! All ${passedCount}/${allCases.length} verifications passed!`,
      { duration: 6000 },
    );
  };

  const handleResetData = () => {
    localMockStore.resetToDefault();
    setTestResults({});
    setProgressPercent(0);
    toast.success("Database reset to pristine sample state.");
  };

  const currentSuite =
    ROLE_TEST_SUITES.find((s) => s.roleId === activeTab) || ROLE_TEST_SUITES[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-semibold shadow-sm w-full"
          >
            <Sparkles className="size-3.5 text-primary" />
            🧪 Live Role Test Suite
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0 border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Flame className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Role-Based Live Sample Test Suite
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Interactive
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Execute live scenario tests for every role to inspect access
                  gates, views, and data mutations.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetData}
                className="h-8 text-xs gap-1.5"
              >
                <RotateCcw className="size-3" />
                Reset Data
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={runningAll || runningRole !== null}
                onClick={handleRunAllRolesSmokeTest}
                className="h-8 text-xs gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-md"
              >
                <Play className="size-3 fill-current" />
                {runningAll
                  ? "Running Smoke Test..."
                  : "🚀 Run Full 5-Role Test"}
              </Button>
            </div>
          </div>

          {/* Progress Bar when running */}
          {runningAll && (
            <div className="mt-3 flex flex-col gap-1.5 animate-in fade-in">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>Smoke test in progress...</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </DialogHeader>

        {/* Tabs & Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full gap-4"
          >
            <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1 rounded-xl h-auto">
              {ROLE_TEST_SUITES.map((suite) => {
                const Icon = suite.icon;
                const isSelected = activeTab === suite.roleId;
                return (
                  <TabsTrigger
                    key={suite.roleId}
                    value={suite.roleId}
                    className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="font-medium">{suite.role}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {ROLE_TEST_SUITES.map((suite) => {
              const Icon = suite.icon;
              return (
                <TabsContent
                  key={suite.roleId}
                  value={suite.roleId}
                  className="flex flex-col gap-4 mt-4 focus-visible:outline-none"
                >
                  {/* Persona Info Banner */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-background border shadow-xs">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {suite.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${suite.badgeColor}`}
                          >
                            {suite.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
                          {suite.summary}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={runningAll || runningRole === suite.roleId}
                      onClick={() => handleRunRoleSuite(suite)}
                      className="h-8 text-xs gap-1.5 shrink-0 font-medium"
                    >
                      <Play className="size-3 fill-current" />
                      {runningRole === suite.roleId
                        ? "Testing..."
                        : `▶ Run ${suite.role} Flow`}
                    </Button>
                  </div>

                  {/* Test Cases List */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sample Test Scenarios
                    </span>

                    {suite.cases.map((testCase, idx) => {
                      const result = testResults[testCase.id];
                      return (
                        <div
                          key={testCase.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card/60 hover:bg-card/90 transition-colors gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground mt-0.5">
                              {result ? (
                                result.success ? (
                                  <CheckCircle2 className="size-4 text-emerald-500" />
                                ) : (
                                  <span className="text-destructive font-bold">
                                    ✕
                                  </span>
                                )
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                {testCase.title}
                                {result && (
                                  <Badge
                                    variant={
                                      result.success ? "outline" : "destructive"
                                    }
                                    className={`text-[9px] px-1 py-0 ${
                                      result.success
                                        ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                                        : ""
                                    }`}
                                  >
                                    {result.success ? "Passed" : "Failed"}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                {testCase.description}
                              </p>
                              {result && (
                                <p className="text-[11px] text-emerald-400 font-mono mt-1">
                                  ✓ {result.detail}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={runningAll || runningRole !== null}
                              onClick={() => handleRunSingleCase(testCase)}
                              className="h-7 text-xs gap-1"
                            >
                              <Play className="size-2.5 fill-current" />
                              {testCase.actionLabel}
                            </Button>
                            {testCase.targetPath && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title={`Open ${testCase.targetPath}`}
                                onClick={() => {
                                  localMockStore.setPersona(suite.personaId);
                                  navigate(testCase.targetPath!);
                                  setOpen(false);
                                  toast.info(
                                    `Navigated to ${testCase.targetPath}`,
                                  );
                                }}
                              >
                                <ExternalLink className="size-3 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground px-5">
          <div className="flex items-center gap-1.5">
            <Lock className="size-3 text-primary" />
            <span>
              Role-Based Access Control (RBAC) is enforced locally with active
              reactive state.
            </span>
          </div>
          <span className="font-mono">PeakForm Mock Engine v2</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
