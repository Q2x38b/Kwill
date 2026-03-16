import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run incremental sync every 2 minutes for all connected users
// This serves as a fallback when push notifications aren't available
crons.interval(
  "sync all users",
  { minutes: 2 },
  internal.sync.background.syncAllUsers
);

// Renew Gmail push notification watches every hour
// Gmail watches expire after 7 days, so we renew any expiring within the next hour
crons.interval(
  "renew gmail watches",
  { hours: 1 },
  internal.sync.gmail.renewExpiringWatches
);

export default crons;
