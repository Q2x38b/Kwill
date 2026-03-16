import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Store synced thread data
 */
export const storeThread = internalMutation({
  args: {
    userId: v.id("users"),
    gmailThreadId: v.string(),
    subject: v.string(),
    snippet: v.string(),
    participants: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
      })
    ),
    messageCount: v.number(),
    lastMessageAt: v.number(),
    isRead: v.boolean(),
    isStarred: v.boolean(),
    isArchived: v.boolean(),
    isTrashed: v.boolean(),
    hasAttachments: v.boolean(),
    labels: v.array(v.string()),
    category: v.optional(
      v.union(
        v.literal("primary"),
        v.literal("social"),
        v.literal("promotions"),
        v.literal("updates")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Check if thread already exists
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_user_gmail_id", (q) =>
        q.eq("userId", args.userId).eq("gmailThreadId", args.gmailThreadId)
      )
      .first();

    if (existing) {
      // Update existing thread
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        snippet: args.snippet,
        participants: args.participants,
        messageCount: args.messageCount,
        lastMessageAt: args.lastMessageAt,
        isRead: args.isRead,
        isStarred: args.isStarred,
        isArchived: args.isArchived,
        isTrashed: args.isTrashed,
        hasAttachments: args.hasAttachments,
        labels: args.labels,
        category: args.category,
      });
      return existing._id;
    }

    // Create new thread
    const threadId = await ctx.db.insert("threads", {
      userId: args.userId,
      gmailThreadId: args.gmailThreadId,
      subject: args.subject,
      snippet: args.snippet,
      participants: args.participants,
      messageCount: args.messageCount,
      lastMessageAt: args.lastMessageAt,
      isRead: args.isRead,
      isStarred: args.isStarred,
      isArchived: args.isArchived,
      isTrashed: args.isTrashed,
      hasAttachments: args.hasAttachments,
      labels: args.labels,
      category: args.category,
    });

    return threadId;
  },
});

/**
 * Store synced message data
 */
export const storeMessage = internalMutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    gmailMessageId: v.string(),
    from: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    to: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
      })
    ),
    cc: v.optional(
      v.array(
        v.object({
          email: v.string(),
          name: v.optional(v.string()),
        })
      )
    ),
    bcc: v.optional(
      v.array(
        v.object({
          email: v.string(),
          name: v.optional(v.string()),
        })
      )
    ),
    subject: v.string(),
    bodyPlain: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    snippet: v.string(),
    sentAt: v.number(),
    receivedAt: v.number(),
    attachments: v.array(
      v.object({
        id: v.string(),
        filename: v.string(),
        mimeType: v.string(),
        size: v.number(),
      })
    ),
    isIncoming: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if message already exists
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_gmail_id", (q) => q.eq("gmailMessageId", args.gmailMessageId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new message
    const messageId = await ctx.db.insert("messages", {
      userId: args.userId,
      threadId: args.threadId,
      gmailMessageId: args.gmailMessageId,
      from: args.from,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyPlain: args.bodyPlain,
      bodyHtml: args.bodyHtml,
      snippet: args.snippet,
      sentAt: args.sentAt,
      receivedAt: args.receivedAt,
      attachments: args.attachments,
      isIncoming: args.isIncoming,
    });

    // Add to search index
    const searchableText = [
      args.subject,
      args.from.name,
      args.from.email,
      args.to.map((t) => `${t.name || ""} ${t.email}`).join(" "),
      args.bodyPlain || "",
    ]
      .filter(Boolean)
      .join(" ");

    await ctx.db.insert("searchIndex", {
      userId: args.userId,
      threadId: args.threadId,
      messageId,
      searchableText,
    });

    return messageId;
  },
});

/**
 * Set Gmail connected status
 */
export const setGmailConnected = internalMutation({
  args: {
    userId: v.id("users"),
    connected: v.boolean(),
    gmailEmail: v.optional(v.string()), // Update user email to match Gmail
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      gmailConnected: args.connected,
      lastSyncAt: args.connected ? Date.now() : undefined,
    };

    // Update user email to match Gmail email for accurate webhook lookup
    if (args.gmailEmail) {
      updates.email = args.gmailEmail;
    }

    await ctx.db.patch(args.userId, updates);
  },
});

/**
 * Update sync state
 */
export const updateSyncState = internalMutation({
  args: {
    userId: v.id("users"),
    historyId: v.optional(v.string()),
    syncInProgress: v.boolean(),
    syncError: v.optional(v.string()),
    isFullSync: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("syncState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        historyId: args.historyId ?? existing.historyId,
        syncInProgress: args.syncInProgress,
        syncError: args.syncError,
        ...(args.isFullSync
          ? { lastFullSyncAt: now }
          : { lastIncrementalSyncAt: now }),
      });
    } else {
      await ctx.db.insert("syncState", {
        userId: args.userId,
        historyId: args.historyId,
        syncInProgress: args.syncInProgress,
        syncError: args.syncError,
        lastFullSyncAt: args.isFullSync ? now : undefined,
        lastIncrementalSyncAt: args.isFullSync ? undefined : now,
      });
    }
  },
});

/**
 * Update Gmail watch state (for push notifications)
 */
export const updateWatchState = internalMutation({
  args: {
    userId: v.id("users"),
    watchExpiration: v.optional(v.number()),
    watchResourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("syncState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        watchExpiration: args.watchExpiration,
        watchResourceId: args.watchResourceId,
      });
    } else {
      // Create sync state if it doesn't exist
      await ctx.db.insert("syncState", {
        userId: args.userId,
        syncInProgress: false,
        watchExpiration: args.watchExpiration,
        watchResourceId: args.watchResourceId,
      });
    }
  },
});
