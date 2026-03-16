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

/**
 * Get sync state for a user
 */
export const getSyncState = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("syncState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get all users with Gmail connected for background sync
 */
export const getConnectedUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("gmailConnected"), true))
      .collect();

    return users;
  },
});

/**
 * Get the oldest thread for a user (for pagination)
 */
export const getOldestThread = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user_last_message", (q) => q.eq("userId", args.userId))
      .order("asc")
      .first();

    return threads;
  },
});

/**
 * Get thread by Gmail thread ID
 */
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
