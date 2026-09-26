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

export default crons;
