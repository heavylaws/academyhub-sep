import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProtectedRoute from "./components/auth/protected-route.tsx";
import { isLocalDev } from "@/lib/env.ts";
import { validateFirestoreConnection } from "@/lib/firebase.ts";

// Code-split pages for high-performance lazy loading
const Academies = lazy(() => import("./pages/admin/academies/page.tsx"));
const Staff = lazy(() => import("./pages/staff/page.tsx"));
const Athletes = lazy(() => import("./pages/athletes/page.tsx"));
const AthleteDetail = lazy(() => import("./pages/athletes/detail-page.tsx"));
const GuardianAthletesPage = lazy(
  () => import("./pages/guardian/athletes-page.tsx"),
);
const Teams = lazy(() => import("./pages/teams/page.tsx"));
const TeamDetail = lazy(() => import("./pages/teams/detail-page.tsx"));
const SessionDetail = lazy(() => import("./pages/sessions/detail-page.tsx"));
const PlanDetail = lazy(() => import("./pages/athletes/plan-detail-page.tsx"));
const FinancePage = lazy(() => import("./pages/finance/page.tsx"));
const MyFeesPage = lazy(() => import("./pages/finance/my-fees-page.tsx"));
const InvoicesPage = lazy(() => import("./pages/invoices/page.tsx"));
const AdminBillingPage = lazy(() => import("./pages/admin/billing/page.tsx"));
const AllUsersPage = lazy(() => import("./pages/admin/users/page.tsx"));
const SchedulePage = lazy(() => import("./pages/schedule/page.tsx"));
const VideoHubPage = lazy(() => import("./pages/athletes/video-hub-page.tsx"));
const AnnouncementsPage = lazy(() => import("./pages/announcements/page.tsx"));
const MessagesPage = lazy(() => import("./pages/messages/page.tsx"));
const KioskPage = lazy(() => import("./pages/kiosk/page.tsx"));
const DrillsPage = lazy(() => import("./pages/drills/page.tsx"));
const TacticalBoardPage = lazy(() => import("./pages/tactical-board/page.tsx"));

function PageLoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading PeakForm...
        </span>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Validate live Firestore connectivity on boot
    validateFirestoreConnection().catch((err) => {
      console.warn("Firestore initialization notice:", err);
    });
  }, []);

  return (
    <DefaultProviders>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/admin/academies"
              element={
                <ProtectedRoute allow={["platform_admin"]}>
                  <Academies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach"]}>
                  <Staff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/athletes"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <Athletes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/athletes/:athleteId"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete", "guardian"]}>
                  <AthleteDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guardian/athletes"
              element={
                <ProtectedRoute allow={["platform_admin", "guardian", "academy_admin"]}>
                  <GuardianAthletesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/:teamId"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <TeamDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/:sessionId"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <SessionDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete", "guardian"]}>
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drills"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <DrillsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tactical-board"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <TacticalBoardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/video-hub"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <VideoHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute
                  allow={["platform_admin", "academy_admin", "coach", "athlete", "accounting", "guardian"]}
                >
                  <AnnouncementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kiosk"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach"]}>
                  <KioskPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kiosk/:sessionId"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach"]}>
                  <KioskPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans/:planId"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "coach", "athlete"]}>
                  <PlanDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "accounting"]}>
                  <FinancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/my-fees"
              element={
                <ProtectedRoute allow={["platform_admin", "athlete", "guardian"]}>
                  <MyFeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute allow={["platform_admin", "academy_admin", "accounting"]}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/billing"
              element={
                <ProtectedRoute allow={["platform_admin"]}>
                  <AdminBillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allow={["platform_admin"]}>
                  <AllUsersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DefaultProviders>
  );
}
