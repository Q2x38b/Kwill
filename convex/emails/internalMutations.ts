import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const archiveThread = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { isArchived: true });
  },
});

export const unarchiveThread = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { isArchived: false });
  },
});

export const trashThread = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { isTrashed: true });
  },
});

export const untrashThread = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { isTrashed: false });
  },
});

export const toggleStar = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (thread) {
      await ctx.db.patch(args.threadId, { isStarred: !thread.isStarred });
    }
  },
});

export const markAsRead = internalMutation({
  args: {
    threadId: v.id("threads"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { isRead: args.isRead });
  },
});

/**
 * Cache fetched message body content
 */
export const cacheMessageBody = internalMutation({
  args: {
    messageId: v.id("messages"),
    bodyPlain: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      bodyPlain: args.bodyPlain,
      bodyHtml: args.bodyHtml,
      bodyFetchedAt: Date.now(),
    });
  },
});
