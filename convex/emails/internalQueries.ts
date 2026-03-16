import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const getThreadById = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

export const getThreadByGmailId = internalQuery({
  args: {
    userId: v.id("users"),
    gmailThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withIndex("by_user_gmail_id", (q) =>
        q.eq("userId", args.userId).eq("gmailThreadId", args.gmailThreadId)
      )
      .first();
  },
});
