import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  UserRound,
  Calendar,
  Menu,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

export function MobileBottomNav() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const { user } = useCurrentUser();

  const isAthlete = user?.role === "athlete";

  const navItems = [
    {
      to: "/",
      label: "Overview",
      icon: LayoutDashboard,
      isActive: location.pathname === "/",
    },
    {
      to: "/drills",
      label: "Drills",
      icon: Target,
      isActive:
        location.pathname === "/drills" ||
        location.pathname.startsWith("/drills/"),
    },
    {
      to: "/athletes",
      label: isAthlete ? "Profile" : "Athletes",
      icon: UserRound,
      isActive:
        location.pathname === "/athletes" ||
        location.pathname.startsWith("/athletes/"),
    },
    {
      to: "/schedule",
      label: "Schedule",
      icon: Calendar,
      isActive:
        location.pathname === "/schedule" ||
        location.pathname.startsWith("/schedule/"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-2 pt-1 pb-[calc(0.4rem+env(safe-area-inset-bottom))] shadow-lg"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-lg transition-colors ${
                item.isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              }`}
            >
              <Icon
                className={`size-5 transition-transform ${
                  item.isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.75]"
                }`}
              />
              <span className="text-[10px] mt-0.5 tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5 stroke-[1.75]" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
