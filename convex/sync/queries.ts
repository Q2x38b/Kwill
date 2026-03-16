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

/**
 * Get user by email address (for Gmail push notifications)
 */
export const getUserByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Get users with expiring Gmail watch (for renewal)
 * Returns users whose watch expires within the next hour
 */
export const getUsersWithExpiringWatch = internalQuery({
  args: {},
  handler: async (ctx) => {
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;

    // Get all sync states
    const syncStates = await ctx.db.query("syncState").collect();

    // Filter to those with watch expiring soon
    const expiringUserIds = syncStates
      .filter((state) => {
        return (
          state.watchExpiration &&
          state.watchExpiration < oneHourFromNow
        );
      })
      .map((state) => state.userId);

    // Get the corresponding users
    const users = await Promise.all(
      expiringUserIds.map((userId) => ctx.db.get(userId))
    );

    return users.filter((user) => user !== null && user.gmailConnected);
  },
});
