import { v } from "convex/values";
import { query } from "../_generated/server";

export const listThreads = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("primary"),
        v.literal("social"),
        v.literal("promotions"),
        v.literal("updates")
      )
    ),
    isStarred: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    isUnread: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { threads: [], nextCursor: null };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) {
      return { threads: [], nextCursor: null };
    }

    const limit = args.limit ?? 50;

    let threadsQuery = ctx.db
      .query("threads")
      .withIndex("by_user_last_message", (q) => q.eq("userId", user._id))
      .order("desc");

    let threads = await threadsQuery.collect();

    // Apply filters
    threads = threads.filter((thread) => {
      if (thread.isTrashed) return false;
      if (args.isArchived !== undefined && thread.isArchived !== args.isArchived) return false;
      if (args.isStarred !== undefined && thread.isStarred !== args.isStarred) return false;
      if (args.isUnread !== undefined && thread.isRead === args.isUnread) return false;
      if (args.category !== undefined && thread.category !== args.category) return false;
      return true;
    });

    // Default to showing non-archived threads
    if (args.isArchived === undefined) {
      threads = threads.filter((t) => !t.isArchived);
    }

    // Pagination
    const paginatedThreads = threads.slice(0, limit);
    const nextCursor = threads.length > limit ? threads[limit]._id : null;

    return {
      threads: paginatedThreads,
      nextCursor,
    };
  },
});

export const getThread = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      return null;
    }

    return thread;
  },
});

export const getMessages = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return [];
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_sent", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    return messages;
  },
});

export const searchThreads = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) {
      return [];
    }

    if (!args.query.trim()) {
      return [];
    }

    const searchResults = await ctx.db
      .query("searchIndex")
      .withSearchIndex("search_content", (q) =>
        q.search("searchableText", args.query).eq("userId", user._id)
      )
      .take(args.limit ?? 20);

    const threadIds = [...new Set(searchResults.map((r) => r.threadId))];
    const threads = await Promise.all(
      threadIds.map((id) => ctx.db.get(id))
    );

    return threads.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) {
      return 0;
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return threads.filter(
      (t) => !t.isRead && !t.isArchived && !t.isTrashed
    ).length;
  },
});
