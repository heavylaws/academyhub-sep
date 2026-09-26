import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Shield,
  UserRound,
  Users,
  Video,
  Megaphone,
  MessageSquare,
  HeartPulse,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notifications/notification-bell.tsx";
import { AcademySwitcher } from "@/components/layout/academy-switcher.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCurrentUser, type UserRole } from "@/hooks/use-current-user.ts";

const ROLE_LABEL: Record<UserRole, string> = {
  platform_admin: "Platform Admin",
  academy_admin: "Academy Admin",
  coach: "Coach",
  athlete: "Athlete",
  accounting: "Accounting",
  guardian: "Parent / Guardian",
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
};

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  platform_admin: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/athletes", label: "Athletes", icon: UserRound },
    { to: "/teams", label: "Teams", icon: Shield },
    { to: "/schedule", label: "Schedule", icon: Calendar },
    { to: "/video-hub", label: "Video Hub", icon: Video },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/announcements", label: "Noticeboard", icon: Megaphone },
    { to: "/staff", label: "Staff", icon: Users },
    { to: "/finance", label: "Fees", icon: DollarSign },
    { to: "/invoices", label: "Invoices", icon: FileText },
    { to: "/admin/academies", label: "All academies", icon: Building2 },
    { to: "/admin/users", label: "All users", icon: Users },
    { to: "/admin/billing", label: "Billing (SaaS)", icon: DollarSign },
  ],
  academy_admin: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/athletes", label: "Athletes", icon: UserRound },
    { to: "/teams", label: "Teams", icon: Shield },
    { to: "/schedule", label: "Schedule", icon: Calendar },
    { to: "/video-hub", label: "Video Hub", icon: Video },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/announcements", label: "Noticeboard", icon: Megaphone },
    { to: "/staff", label: "Staff", icon: Users },
    { to: "/finance", label: "Fees", icon: DollarSign },
    { to: "/invoices", label: "Invoices", icon: FileText },
  ],
  coach: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/athletes", label: "Athletes", icon: UserRound },
    { to: "/teams", label: "Teams", icon: Shield },
    { to: "/schedule", label: "Schedule", icon: Calendar },
    { to: "/video-hub", label: "Video Hub", icon: Video },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/announcements", label: "Noticeboard", icon: Megaphone },
    { to: "/staff", label: "Staff", icon: Users },
  ],
  accounting: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/announcements", label: "Noticeboard", icon: Megaphone },
    { to: "/finance", label: "Fees", icon: DollarSign },
    { to: "/invoices", label: "Invoices", icon: FileText },
  ],
  athlete: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/athletes", label: "My profile", icon: UserRound },
    { to: "/teams", label: "My teams", icon: Shield },
    { to: "/schedule", label: "Schedule", icon: Calendar },
    { to: "/video-hub", label: "Video Hub", icon: Video },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/announcements", label: "Noticeboard", icon: Megaphone },
    { to: "/finance/my-fees", label: "My fees", icon: DollarSign },
  ],
  guardian: [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/guardian/athletes", label: "My Athletes", icon: HeartPulse },
    { to: "/schedule", label: "Schedule", icon: Calendar },
    { to: "/announcements", label: "Noticeboard", icon: Megaphone },
    { to: "/finance/my-fees", label: "Invoices & Fees", icon: DollarSign },
  ],
};

function initials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { user } = useCurrentUser();
  const { signout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role;
  const navItems = role ? NAV_BY_ROLE[role] : [];

  const handleSignOut = async () => {
    await signout();
    navigate("/", { replace: true });
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Activity className="size-4" />
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="font-display text-sm font-bold">PeakForm</span>
              <span className="text-[11px] text-sidebar-foreground/60">
                Athletics
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        location.pathname === item.to ||
                        location.pathname.startsWith(item.to + "/")
                      }
                      tooltip={item.label}
                    >
                      {item.comingSoon ? (
                        <button
                          type="button"
                          onClick={() =>
                            toast("Coming soon in a future milestone!")
                          }
                          className="w-full"
                        >
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </button>
                      ) : (
                        <Link to={item.to}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Separator className="mb-2 bg-sidebar-border" />
          <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
            <Avatar className="size-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                {initials(user?.name ?? user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col leading-tight gap-0.5">
              <span className="truncate text-xs font-semibold text-foreground">
                {user?.name ?? "Signed in"}
              </span>
              <span className="truncate text-[10px] font-mono text-muted-foreground">
                {user?.email}
              </span>
              {role && (
                <Badge
                  variant="secondary"
                  className="w-fit gap-1 px-1.5 py-0 text-[9px] font-normal mt-0.5"
                >
                  {role === "platform_admin" ? (
                    <ShieldCheck className="size-2.5 text-primary" />
                  ) : (
                    <UserRound className="size-2.5 text-primary" />
                  )}
                  {ROLE_LABEL[role]}
                </Badge>
              )}
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} tooltip="Sign out">
                <LogOut className="size-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            {role === "platform_admin" ? (
              <AcademySwitcher currentAcademyId={user?.academyId} />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                {role ? ROLE_LABEL[role] : ""} Workspace
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
