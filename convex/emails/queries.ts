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
    cursor: v.optional(v.number()), // Use lastMessageAt timestamp as cursor
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { threads: [], nextCursor: null, hasMore: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) {
      return { threads: [], nextCursor: null, hasMore: false };
    }

    const limit = args.limit ?? 25;

    // Get threads using index, ordered by lastMessageAt desc
    let threadsQuery = ctx.db
      .query("threads")
      .withIndex("by_user_last_message", (q) => q.eq("userId", user._id))
      .order("desc");

    let threads = await threadsQuery.collect();

    // Apply cursor - filter to threads older than cursor timestamp
    if (args.cursor) {
      threads = threads.filter((t) => t.lastMessageAt < args.cursor!);
    }

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

    // Get one more than limit to check if there are more
    const hasMore = threads.length > limit;
    const paginatedThreads = threads.slice(0, limit);

    // Use the last thread's timestamp as the cursor for next page
    const nextCursor = hasMore && paginatedThreads.length > 0
      ? paginatedThreads[paginatedThreads.length - 1].lastMessageAt
      : null;

    return {
      threads: paginatedThreads,
      nextCursor,
      hasMore,
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

// List sent emails - threads where user sent at least one message
export const listSentThreads = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { threads: [], nextCursor: null, hasMore: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) {
      return { threads: [], nextCursor: null, hasMore: false };
    }

    const limit = args.limit ?? 25;

    // Get all messages sent by the user (isIncoming: false)
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter to only outgoing messages and get unique thread IDs
    const sentThreadIds = [
      ...new Set(
        sentMessages
          .filter((m) => !m.isIncoming)
          .map((m) => m.threadId)
      ),
    ];

    // Get the threads
    const threads = await Promise.all(
      sentThreadIds.map((id) => ctx.db.get(id))
    );

    // Filter out nulls, trashed, and sort by lastMessageAt
    let validThreads = threads
      .filter((t): t is NonNullable<typeof t> => t !== null && !t.isTrashed)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // Apply cursor
    if (args.cursor) {
      validThreads = validThreads.filter((t) => t.lastMessageAt < args.cursor!);
    }

    // Paginate
    const hasMore = validThreads.length > limit;
    const paginatedThreads = validThreads.slice(0, limit);
    const nextCursor =
      hasMore && paginatedThreads.length > 0
        ? paginatedThreads[paginatedThreads.length - 1].lastMessageAt
        : null;

    return {
      threads: paginatedThreads,
      nextCursor,
      hasMore,
    };
  },
});

// List user's drafts
export const listDrafts = query({
  args: {
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

    const limit = args.limit ?? 50;

    const drafts = await ctx.db
      .query("drafts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return drafts;
  },
});

// Search contacts by email or name for autocomplete
export const searchContacts = query({
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

    const searchQuery = args.query.toLowerCase().trim();
    if (!searchQuery) {
      // Return top contacts by email count if no search query
      const topContacts = await ctx.db
        .query("contacts")
        .withIndex("by_user_email_count", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(args.limit ?? 10);
      return topContacts;
    }

    // Get all user contacts and filter by search query
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter by email or name match
    const matches = contacts
      .filter((c) => {
        const emailMatch = c.email.toLowerCase().includes(searchQuery);
        const nameMatch = c.name?.toLowerCase().includes(searchQuery);
        return emailMatch || nameMatch;
      })
      .sort((a, b) => b.emailCount - a.emailCount) // Sort by email frequency
      .slice(0, args.limit ?? 10);

    return matches;
  },
});
