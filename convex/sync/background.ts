"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Background sync for all connected users
 * Called by cron job every 2 minutes
 */
export const syncAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all users with Gmail connected
    const users = await ctx.runQuery(internal.sync.queries.getConnectedUsers, {});

    if (!users || users.length === 0) {
      console.log("No connected users to sync");
      return { synced: 0 };
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Try incremental sync first
        const result = await ctx.runAction(
          internal.sync.gmail.incrementalSyncInternal,
          { clerkUserId: user.clerkId }
        );

        // If incremental sync says full sync needed, do it
        if (result.needsFullSync) {
          await ctx.runAction(internal.sync.gmail.fullSyncInternal, {
            clerkUserId: user.clerkId,
          });
        }

        syncedCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to sync user ${user.clerkId}:`, errorMsg);
        errors.push(`${user.email}: ${errorMsg}`);
      }
    }

    console.log(`Background sync complete: ${syncedCount}/${users.length} users synced`);

    return {
      synced: syncedCount,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
