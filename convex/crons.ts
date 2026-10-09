import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();

// Times are UTC.
crons.daily(
  "generate recurring monthly fees",
  { hourUTC: 4, minuteUTC: 17 },
  internal.feeAutomation.generateMonthlyFees,
  {},
);
crons.daily(
  "fee reminders and overdue status",
  { hourUTC: 5, minuteUTC: 17 },
  internal.feeAutomation.updateOverdueAndReminders,
  {},
);
crons.daily(
  "cleanup expired login attempts",
  { hourUTC: 6, minuteUTC: 0 },
  internal.authRateLimit.cleanupExpiredAttempts,
  {},
);

export default crons;
