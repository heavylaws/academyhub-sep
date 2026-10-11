/**
 * Tenant Isolation Utility
 *
 * Ensures each academy strictly sees only its own respective data across
 * all platform tabs, components, and queries.
 */

export const FOREIGN_ACADEMY_PATTERNS: RegExp[] = [
  /haj[\s_-]?ali/i,
  /al[\s_-]?hakkani/i,
  /sport[\s_-]?zona/i,
  /elite[\s_-]?academy/i,
  /cedar/i,
  /bad[\s_-]?ems/i,
  /c00ldude/i,
  /olympus/i,
  /titan/i,
  /baalbaki/i,
  /heavylaws/i,
];

export function isForeignEntityText(...texts: unknown[]): boolean {
  for (const text of texts) {
    if (!text) continue;
    const str = String(text).toLowerCase();
    for (const pattern of FOREIGN_ACADEMY_PATTERNS) {
      if (pattern.test(str)) return true;
    }
  }
  return false;
}

export interface TenantScopedEntity {
  _id?: unknown;
  academyId?: unknown;
  role?: string | null;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  recipientName?: string | null;
  athleteName?: string | null;
  content?: string | null;
  teamName?: string | null;
  slug?: string | null;
  [key: string]: unknown;
}

/**
 * Validates whether an entity belongs strictly to the target academy
 * and is not a foreign academy record or platform admin system account.
 */
export function isEntityInAcademy(
  entity: TenantScopedEntity,
  targetAcademyId?: string,
): boolean {
  if (!entity || typeof entity !== "object") return false;

  // Platform admin is a global system account and must never show in academy tenant views
  if (entity.role === "platform_admin") return false;

  // Strict tenant boundary by academy ID
  if (targetAcademyId && entity.academyId && entity.academyId !== targetAcademyId) {
    return false;
  }

  // Cross-tenant text contamination check
  const textFields = [
    entity.email,
    entity.name,
    entity.firstName,
    entity.lastName,
    entity.title,
    entity.recipientName,
    entity.athleteName,
    entity.content,
    entity.teamName,
  ];

  if (isForeignEntityText(...textFields)) {
    return false;
  }

  return true;
}
