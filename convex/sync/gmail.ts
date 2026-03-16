"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { GmailThread, GmailListResponse } from "../lib/gmail_types";
import {
  parseGmailMessage,
  getCategoryFromLabels,
  isEmailRead,
  isEmailStarred,
  isEmailArchived,
  isEmailTrashed,
} from "../lib/gmail_parser";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

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
 * Get user's email address from Gmail profile
 */
async function getGmailProfile(accessToken: string): Promise<{ email: string }> {
  const profile = await gmailFetch<{ emailAddress: string }>(
    "/profile",
    accessToken
  );
  return { email: profile.emailAddress };
}

/**
 * List Gmail threads
 */
async function listGmailThreads(
  accessToken: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<GmailListResponse<{ id: string; historyId: string }>> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    labelIds: "INBOX",
  });
  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  return gmailFetch<GmailListResponse<{ id: string; historyId: string }>>(
    `/threads?${params}`,
    accessToken
  );
}

/**
 * Get a full Gmail thread with messages
 */
async function getGmailThread(
  accessToken: string,
  threadId: string
): Promise<GmailThread> {
  return gmailFetch<GmailThread>(
    `/threads/${threadId}?format=full`,
    accessToken
  );
}

/**
 * Full sync action - syncs inbox threads from Gmail
 */
export const fullSync = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from database
    const user = await ctx.runQuery(internal.sync.queries.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    // Update sync state to in progress
    await ctx.runMutation(internal.sync.mutations.updateSyncState, {
      userId: user._id,
      syncInProgress: true,
      isFullSync: true,
    });

    try {
      // Get user's email from Gmail profile
      const profile = await getGmailProfile(args.accessToken);
      const userEmail = profile.email;

      // List threads from inbox
      const threadList = await listGmailThreads(args.accessToken, 50);

      if (!threadList.threads || threadList.threads.length === 0) {
        // No threads found
        await ctx.runMutation(internal.sync.mutations.updateSyncState, {
          userId: user._id,
          syncInProgress: false,
          isFullSync: true,
        });

        // Update user's Gmail connected status
        await ctx.runMutation(internal.sync.mutations.setGmailConnected, {
          userId: user._id,
          connected: true,
        });

        return { success: true, threadsSynced: 0, message: "No threads found in inbox" };
      }

      let syncedCount = 0;

      // Process each thread
      for (const threadRef of threadList.threads) {
        try {
          // Get full thread with messages
          const fullThread = await getGmailThread(args.accessToken, threadRef.id);

          if (!fullThread.messages || fullThread.messages.length === 0) {
            continue;
          }

          // Get the first and last messages for thread metadata
          const firstMessage = fullThread.messages[0];
          const lastMessage = fullThread.messages[fullThread.messages.length - 1];

          // Parse messages to get thread metadata
          const parsedFirst = parseGmailMessage(firstMessage, userEmail);
          const parsedLast = parseGmailMessage(lastMessage, userEmail);

          // Collect all participants
          const participantsMap = new Map<string, { email: string; name?: string }>();
          for (const msg of fullThread.messages) {
            const parsed = parseGmailMessage(msg, userEmail);
            participantsMap.set(parsed.from.email, parsed.from);
            for (const recipient of parsed.to) {
              participantsMap.set(recipient.email, recipient);
            }
          }
          const participants = Array.from(participantsMap.values()).slice(0, 10);

          // Check thread labels from the last message
          const labels = lastMessage.labelIds || [];
          const threadHasAttachments = fullThread.messages.some(
            (m) => parseGmailMessage(m, userEmail).attachments.length > 0
          );

          // Store thread
          const threadId = await ctx.runMutation(internal.sync.mutations.storeThread, {
            userId: user._id,
            gmailThreadId: fullThread.id,
            subject: parsedFirst.subject,
            snippet: parsedLast.snippet,
            participants,
            messageCount: fullThread.messages.length,
            lastMessageAt: parsedLast.receivedAt,
            isRead: isEmailRead(labels),
            isStarred: isEmailStarred(labels),
            isArchived: isEmailArchived(labels),
            isTrashed: isEmailTrashed(labels),
            hasAttachments: threadHasAttachments,
            labels,
            category: getCategoryFromLabels(labels),
          });

          // Store each message
          for (const message of fullThread.messages) {
            const parsed = parseGmailMessage(message, userEmail);

            await ctx.runMutation(internal.sync.mutations.storeMessage, {
              userId: user._id,
              threadId,
              gmailMessageId: parsed.gmailMessageId,
              from: parsed.from,
              to: parsed.to,
              cc: parsed.cc,
              bcc: parsed.bcc,
              subject: parsed.subject,
              bodyPlain: parsed.bodyPlain,
              bodyHtml: parsed.bodyHtml,
              snippet: parsed.snippet,
              sentAt: parsed.sentAt,
              receivedAt: parsed.receivedAt,
              attachments: parsed.attachments,
              isIncoming: parsed.isIncoming,
            });
          }

          syncedCount++;
        } catch (err) {
          console.error(`Failed to sync thread ${threadRef.id}:`, err);
          // Continue with other threads
        }
      }

      // Update sync state to complete
      await ctx.runMutation(internal.sync.mutations.updateSyncState, {
        userId: user._id,
        syncInProgress: false,
        isFullSync: true,
        historyId: threadList.threads[0]?.historyId,
      });

      // Update user's Gmail connected status
      await ctx.runMutation(internal.sync.mutations.setGmailConnected, {
        userId: user._id,
        connected: true,
      });

      return {
        success: true,
        threadsSynced: syncedCount,
        message: `Synced ${syncedCount} threads from Gmail`,
      };
    } catch (err) {
      // Update sync state with error
      await ctx.runMutation(internal.sync.mutations.updateSyncState, {
        userId: user._id,
        syncInProgress: false,
        isFullSync: true,
        syncError: err instanceof Error ? err.message : "Unknown error",
      });

      throw err;
    }
  },
});

// Export gmailFetch for use by other modules
export { gmailFetch };
