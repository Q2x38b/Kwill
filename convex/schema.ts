import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User settings and preferences
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    gmailConnected: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    settings: v.object({
      signature: v.optional(v.string()),
      swipeLeftAction: v.literal("delete"),
      swipeRightAction: v.literal("archive"),
      theme: v.union(v.literal("system"), v.literal("light"), v.literal("dark")),
    }),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // OAuth tokens
  oauthTokens: defineTable({
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scopes: v.array(v.string()),
  }).index("by_user", ["userId"]),

  // Email threads (conversations)
  threads: defineTable({
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
  })
    .index("by_user", ["userId"])
    .index("by_user_gmail_id", ["userId", "gmailThreadId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_user_starred", ["userId", "isStarred"])
    .index("by_user_archived", ["userId", "isArchived"])
    .index("by_user_last_message", ["userId", "lastMessageAt"]),

  // Individual email messages
  messages: defineTable({
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
  })
    .index("by_thread", ["threadId"])
    .index("by_user", ["userId"])
    .index("by_gmail_id", ["gmailMessageId"])
    .index("by_thread_sent", ["threadId", "sentAt"]),

  // Contacts from Google People API
  contacts: defineTable({
    userId: v.id("users"),
    googleResourceName: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    phoneNumbers: v.optional(v.array(v.string())),
    emailCount: v.number(),
    lastEmailedAt: v.optional(v.number()),
    isFavorite: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_email", ["userId", "email"])
    .index("by_user_favorite", ["userId", "isFavorite"])
    .index("by_user_email_count", ["userId", "emailCount"]),

  // Drafts
  drafts: defineTable({
    userId: v.id("users"),
    gmailDraftId: v.optional(v.string()),
    replyToThreadId: v.optional(v.id("threads")),
    replyToMessageId: v.optional(v.id("messages")),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    body: v.string(),
    attachments: v.array(
      v.object({
        filename: v.string(),
        mimeType: v.string(),
        size: v.number(),
        uploadId: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_reply_thread", ["replyToThreadId"]),

  // Search index for full-text search
  searchIndex: defineTable({
    userId: v.id("users"),
    threadId: v.id("threads"),
    messageId: v.id("messages"),
    searchableText: v.string(),
  })
    .index("by_user", ["userId"])
    .searchIndex("search_content", {
      searchField: "searchableText",
      filterFields: ["userId"],
    }),

  // Sync state tracking
  syncState: defineTable({
    userId: v.id("users"),
    historyId: v.optional(v.string()),
    lastFullSyncAt: v.optional(v.number()),
    lastIncrementalSyncAt: v.optional(v.number()),
    syncInProgress: v.boolean(),
    syncError: v.optional(v.string()),
    // Gmail Push Notifications (watch) state
    watchExpiration: v.optional(v.number()), // Unix timestamp when watch expires
    watchResourceId: v.optional(v.string()), // Resource ID from Gmail watch
  }).index("by_user", ["userId"]),
});
