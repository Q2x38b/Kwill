import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * Get user by Clerk ID (internal query for sync actions)
 */
export const getUserByClerkId = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});
