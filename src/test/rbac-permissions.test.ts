import { describe, expect, it } from "vitest";
import type { UserRole } from "@/hooks/use-current-user.ts";

/**
 * Route authorization matrix defining the allowed routes for each system role.
 */
const ROLE_PERMISSIONS: Record<UserRole, { allowed: string[]; forbidden: string[] }> = {
  platform_admin: {
    allowed: ["/", "/admin/academies", "/admin/billing"],
    forbidden: ["/staff", "/finance", "/finance/my-fees", "/invoices"],
  },
  academy_admin: {
    allowed: [
      "/",
      "/athletes",
      "/teams",
      "/schedule",
      "/video-hub",
      "/staff",
      "/finance",
      "/invoices",
    ],
    forbidden: ["/admin/academies", "/admin/billing", "/finance/my-fees"],
  },
  coach: {
    allowed: [
      "/",
      "/athletes",
      "/teams",
      "/schedule",
      "/video-hub",
      "/staff",
    ],
    forbidden: ["/admin/academies", "/admin/billing", "/finance", "/invoices", "/finance/my-fees"],
  },
  accounting: {
    allowed: ["/", "/finance", "/invoices"],
    forbidden: [
      "/admin/academies",
      "/admin/billing",
      "/staff",
      "/video-hub",
      "/finance/my-fees",
    ],
  },
  athlete: {
    allowed: ["/", "/athletes", "/teams", "/schedule", "/video-hub", "/finance/my-fees"],
    forbidden: ["/admin/academies", "/admin/billing", "/staff", "/finance", "/invoices"],
  },
  guardian: {
    allowed: ["/", "/guardian/athletes", "/schedule", "/finance/my-fees"],
    forbidden: [
      "/admin/academies",
      "/admin/billing",
      "/staff",
      "/finance",
      "/invoices",
      "/video-hub",
    ],
  },
};

function isRouteAllowed(role: UserRole, path: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.allowed.includes(path);
}

describe("RBAC Permissions & Route Authorization Suite", () => {
  describe("Platform Admin access", () => {
    const role: UserRole = "platform_admin";

    it("grants access to platform overview, academy list, and platform billing", () => {
      expect(isRouteAllowed(role, "/")).toBe(true);
      expect(isRouteAllowed(role, "/admin/academies")).toBe(true);
      expect(isRouteAllowed(role, "/admin/billing")).toBe(true);
    });

    it("forbids access to academy-level finance and staff operations", () => {
      expect(isRouteAllowed(role, "/staff")).toBe(false);
      expect(isRouteAllowed(role, "/finance")).toBe(false);
      expect(isRouteAllowed(role, "/invoices")).toBe(false);
    });
  });

  describe("Academy Admin access", () => {
    const role: UserRole = "academy_admin";

    it("grants full academy administrative access", () => {
      expect(isRouteAllowed(role, "/athletes")).toBe(true);
      expect(isRouteAllowed(role, "/teams")).toBe(true);
      expect(isRouteAllowed(role, "/schedule")).toBe(true);
      expect(isRouteAllowed(role, "/video-hub")).toBe(true);
      expect(isRouteAllowed(role, "/staff")).toBe(true);
      expect(isRouteAllowed(role, "/finance")).toBe(true);
      expect(isRouteAllowed(role, "/invoices")).toBe(true);
    });

    it("blocks super-admin cross-academy billing controls", () => {
      expect(isRouteAllowed(role, "/admin/academies")).toBe(false);
      expect(isRouteAllowed(role, "/admin/billing")).toBe(false);
    });
  });

  describe("Coach access", () => {
    const role: UserRole = "coach";

    it("allows athlete management, training schedule, staff list, and video hub", () => {
      expect(isRouteAllowed(role, "/athletes")).toBe(true);
      expect(isRouteAllowed(role, "/teams")).toBe(true);
      expect(isRouteAllowed(role, "/schedule")).toBe(true);
      expect(isRouteAllowed(role, "/video-hub")).toBe(true);
      expect(isRouteAllowed(role, "/staff")).toBe(true);
    });

    it("strictly isolates coach from tuition fees and billing", () => {
      expect(isRouteAllowed(role, "/finance")).toBe(false);
      expect(isRouteAllowed(role, "/invoices")).toBe(false);
      expect(isRouteAllowed(role, "/admin/billing")).toBe(false);
    });
  });

  describe("Athlete access", () => {
    const role: UserRole = "athlete";

    it("allows viewing profile, teams, schedule, video hub, and personal fee invoice", () => {
      expect(isRouteAllowed(role, "/athletes")).toBe(true);
      expect(isRouteAllowed(role, "/teams")).toBe(true);
      expect(isRouteAllowed(role, "/schedule")).toBe(true);
      expect(isRouteAllowed(role, "/video-hub")).toBe(true);
      expect(isRouteAllowed(role, "/finance/my-fees")).toBe(true);
    });

    it("strictly blocks academy administrative and full ledger access", () => {
      expect(isRouteAllowed(role, "/finance")).toBe(false);
      expect(isRouteAllowed(role, "/invoices")).toBe(false);
      expect(isRouteAllowed(role, "/staff")).toBe(false);
      expect(isRouteAllowed(role, "/admin/academies")).toBe(false);
    });
  });

  describe("Accounting access", () => {
    const role: UserRole = "accounting";

    it("allows ledger management, fee logging, and invoice generation", () => {
      expect(isRouteAllowed(role, "/finance")).toBe(true);
      expect(isRouteAllowed(role, "/invoices")).toBe(true);
    });

    it("restricts coaching features, staff administration, and platform configs", () => {
      expect(isRouteAllowed(role, "/staff")).toBe(false);
      expect(isRouteAllowed(role, "/video-hub")).toBe(false);
      expect(isRouteAllowed(role, "/admin/academies")).toBe(false);
    });
  });

  describe("Parent / Guardian access", () => {
    const role: UserRole = "guardian";

    it("allows guardian athletes portal, schedule, and family fee payment", () => {
      expect(isRouteAllowed(role, "/")).toBe(true);
      expect(isRouteAllowed(role, "/guardian/athletes")).toBe(true);
      expect(isRouteAllowed(role, "/schedule")).toBe(true);
      expect(isRouteAllowed(role, "/finance/my-fees")).toBe(true);
    });

    it("restricts internal staff directory, general roster management, and billing admin", () => {
      expect(isRouteAllowed(role, "/staff")).toBe(false);
      expect(isRouteAllowed(role, "/finance")).toBe(false);
      expect(isRouteAllowed(role, "/invoices")).toBe(false);
      expect(isRouteAllowed(role, "/video-hub")).toBe(false);
      expect(isRouteAllowed(role, "/admin/academies")).toBe(false);
    });
  });
});
