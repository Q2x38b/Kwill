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
    try {
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

      // Get all threads for this user and filter for ones with sent messages
      const allThreads = await ctx.db
        .query("threads")
        .withIndex("by_user_last_message", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();

      // For each thread, check if user has sent any messages
      const threadsWithSentMessages = [];
      for (const thread of allThreads) {
        if (thread.isTrashed) continue;

        const messages = await ctx.db
          .query("messages")
          .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
          .collect();

        const hasSentMessage = messages.some((m) => !m.isIncoming);
        if (hasSentMessage) {
          threadsWithSentMessages.push(thread);
        }
      }

      // Apply cursor
      let filteredThreads = threadsWithSentMessages;
      if (args.cursor) {
        filteredThreads = filteredThreads.filter(
          (t) => t.lastMessageAt < args.cursor!
        );
      }

      // Paginate
      const hasMore = filteredThreads.length > limit;
      const paginatedThreads = filteredThreads.slice(0, limit);
      const nextCursor =
        hasMore && paginatedThreads.length > 0
          ? paginatedThreads[paginatedThreads.length - 1].lastMessageAt
          : null;

      return {
        threads: paginatedThreads,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      console.error("listSentThreads error:", error);
      return { threads: [], nextCursor: null, hasMore: false };
    }
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
    const limit = args.limit ?? 10;

    // Get contacts from the contacts table
    let contacts = await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter by search query if provided
    if (searchQuery) {
      contacts = contacts.filter((c) => {
        const emailMatch = c.email.toLowerCase().includes(searchQuery);
        const nameMatch = c.name?.toLowerCase().includes(searchQuery);
        return emailMatch || nameMatch;
      });
    }

    // Sort by email frequency
    contacts.sort((a, b) => b.emailCount - a.emailCount);

    // If we have enough contacts, return them
    if (contacts.length >= limit) {
      return contacts.slice(0, limit);
    }

    // Fallback: also search thread participants for suggestions
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100); // Check recent threads

    // Extract unique participants from threads
    const participantMap = new Map<string, { email: string; name?: string }>();
    const existingEmails = new Set(contacts.map((c) => c.email.toLowerCase()));

    for (const thread of threads) {
      for (const participant of thread.participants || []) {
        const email = participant.email.toLowerCase();
        // Skip user's own email and already found contacts
        if (email === user.email.toLowerCase()) continue;
        if (existingEmails.has(email)) continue;

        // Check if matches search query
        if (searchQuery) {
          const emailMatch = email.includes(searchQuery);
          const nameMatch = participant.name?.toLowerCase().includes(searchQuery);
          if (!emailMatch && !nameMatch) continue;
        }

        if (!participantMap.has(email)) {
          participantMap.set(email, {
            email: participant.email,
            name: participant.name,
          });
        }
      }
    }

    // Convert participants to contact-like objects
    const participantContacts = Array.from(participantMap.values()).map((p) => ({
      _id: `participant_${p.email}` as string,
      email: p.email,
      name: p.name,
      emailCount: 0,
      isFavorite: false,
      userId: user._id,
      googleResourceName: undefined as string | undefined,
      avatarUrl: undefined as string | undefined,
    }));

    // Combine and limit results
    const combined = [...contacts, ...participantContacts];
    return combined.slice(0, limit);
  },
});
