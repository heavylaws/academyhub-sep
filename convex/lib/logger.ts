import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.d.ts";

export interface LogContext {
  userId?: Id<"users">;
  academyId?: Id<"academies">;
  [key: string]: unknown;
}

export type LogLevel = "info" | "warn" | "error";

/**
 * Structured logger for Convex functions.
 * Emits JSON logs to Convex system observability for audit, metrics, and incident debugging.
 */
export function logAction(
  action: string,
  details: LogContext,
  level: LogLevel = "info",
) {
  const payload = {
    level,
    action,
    timestamp: new Date().toISOString(),
    ...details,
  };

  const formatted = `[AUDIT_LOG] ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.info(formatted);
  }
}
