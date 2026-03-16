import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run incremental sync every 2 minutes for all connected users
crons.interval(
  "sync all users",
  { minutes: 2 },
  internal.sync.background.syncAllUsers
);

export default crons;
