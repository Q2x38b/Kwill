"use node";

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type {
  GmailThread,
  GmailMessage,
  GmailListResponse,
  GmailHistoryResponse,
} from "../lib/gmail-types";
import {
  parseGmailMessage,
  isEmailRead,
  isEmailStarred,
  isEmailArchived,
  isEmailTrashed,
  getCategoryFromLabels,
  hasAttachments,
} from "../lib/gmail-parser";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const MAX_THREADS_PER_SYNC = 100;
const RETRY_DELAY_MS = 60000; // 60 seconds
const MAX_RETRIES = 3;

interface SyncContext {
  accessToken: string;
  userId: Id<"users">;
  userEmail: string;
}

/**
 * Make an authenticated request to Gmail API
 */
async function gmailFetch<T>(
  endpoint: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const url = `${GMAIL_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * List threads from Gmail
 */
async function listThreads(
  accessToken: string,
  pageToken?: string,
  maxResults = 50
): Promise<GmailListResponse<{ id: string; historyId: string }>> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    labelIds: "INBOX",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  return gmailFetch(`/threads?${params}`, accessToken);
}

/**
 * Get a full thread with messages
 */
async function getThread(
  accessToken: string,
  threadId: string
): Promise<GmailThread> {
  return gmailFetch(`/threads/${threadId}?format=full`, accessToken);
}

/**
 * Get message details
 */
async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  return gmailFetch(`/messages/${messageId}?format=full`, accessToken);
}

/**
 * Get history changes since a historyId
 */
async function getHistory(
  accessToken: string,
  startHistoryId: string,
  pageToken?: string
): Promise<GmailHistoryResponse> {
  const params = new URLSearchParams({
    startHistoryId,
    labelId: "INBOX",
    historyTypes: "messageAdded,messageDeleted,labelAdded,labelRemoved",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  return gmailFetch(`/history?${params}`, accessToken);
}

/**
 * Full sync action - syncs all inbox threads
 */
export const fullSync = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user and OAuth token
    // Note: In production, you'd retrieve the OAuth token from your token store
    // For now, this is a placeholder - you'll need to implement token retrieval
    // through Clerk's OAuth token management

    // This action would need to:
    // 1. Get the user's OAuth access token
    // 2. Call Gmail API to list threads
    // 3. Process each thread and store in Convex
    // 4. Update sync state

    // Since we can't directly access Clerk's OAuth tokens in Convex actions,
    // the frontend would typically pass the token or trigger sync

    return { success: true, message: "Sync initiated" };
  },
});

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
