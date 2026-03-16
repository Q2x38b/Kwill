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

export const getMessageById = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

/**
 * Get messages in a thread that don't have body content cached
 */
export const getMessagesNeedingContent = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    // Return messages without cached body content
    return messages.filter((m) => !m.bodyFetchedAt);
  },
});
