"use node";

// Declare process for Node.js environment
declare const process: { env: Record<string, string | undefined> };

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
 * Get Google OAuth token from Clerk Backend API
 */
async function getGoogleOAuthToken(clerkUserId: string): Promise<string> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY environment variable not set");
  }

  // Get user's OAuth access tokens from Clerk
  const response = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_google`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get OAuth token from Clerk: ${response.status} - ${error}`);
  }

  const tokens = await response.json();

  if (!tokens || tokens.length === 0 || !tokens[0].token) {
    throw new Error("No Google OAuth token found. Please reconnect your Google account.");
  }

  return tokens[0].token;
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
  args: {},
  handler: async (ctx): Promise<{ success: boolean; threadsSynced: number; message?: string }> => {
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
      // Get Google OAuth token from Clerk
      const accessToken = await getGoogleOAuthToken(identity.subject);

      // Get user's email from Gmail profile
      const profile = await getGmailProfile(accessToken);
      const userEmail = profile.email;

      // List threads from inbox
      const threadList = await listGmailThreads(accessToken, 50);

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
          const fullThread = await getGmailThread(accessToken, threadRef.id);

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

/**
 * Get Gmail history (changes since last sync)
 */
interface HistoryResponse {
  history?: Array<{
    id: string;
    messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
    messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
    labelsAdded?: Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
    labelsRemoved?: Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
  }>;
  historyId: string;
  nextPageToken?: string;
}

async function getGmailHistory(
  accessToken: string,
  startHistoryId: string
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    startHistoryId,
    labelId: "INBOX",
  });

  return gmailFetch<HistoryResponse>(
    `/history?${params}`,
    accessToken
  );
}

/**
 * Incremental sync - only fetch changes since last sync
 */
export const incrementalSync = action({
  args: {},
  handler: async (ctx): Promise<{ success?: boolean; needsFullSync?: boolean; skipped?: boolean; changes?: number; message?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.sync.queries.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    // Get current sync state
    const syncState = await ctx.runQuery(internal.sync.queries.getSyncState, {
      userId: user._id,
    });

    // If no history ID, do a full sync instead
    if (!syncState?.historyId) {
      return { needsFullSync: true, message: "No history ID found, full sync required" };
    }

    // Check if sync is already in progress
    if (syncState.syncInProgress) {
      return { skipped: true, message: "Sync already in progress" };
    }

    // Update sync state to in progress
    await ctx.runMutation(internal.sync.mutations.updateSyncState, {
      userId: user._id,
      syncInProgress: true,
      isFullSync: false,
    });

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);
      const profile = await getGmailProfile(accessToken);
      const userEmail = profile.email;

      // Get history since last sync
      const history = await getGmailHistory(accessToken, syncState.historyId);

      if (!history.history || history.history.length === 0) {
        // No changes
        await ctx.runMutation(internal.sync.mutations.updateSyncState, {
          userId: user._id,
          syncInProgress: false,
          isFullSync: false,
          historyId: history.historyId,
        });

        return { success: true, changes: 0, message: "No new changes" };
      }

      // Collect unique thread IDs that changed
      const changedThreadIds = new Set<string>();
      for (const entry of history.history) {
        for (const added of entry.messagesAdded || []) {
          changedThreadIds.add(added.message.threadId);
        }
        for (const labelChange of entry.labelsAdded || []) {
          changedThreadIds.add(labelChange.message.threadId);
        }
        for (const labelChange of entry.labelsRemoved || []) {
          changedThreadIds.add(labelChange.message.threadId);
        }
      }

      let syncedCount = 0;

      // Re-sync each changed thread
      for (const gmailThreadId of changedThreadIds) {
        try {
          const fullThread = await getGmailThread(accessToken, gmailThreadId);

          if (!fullThread.messages || fullThread.messages.length === 0) {
            continue;
          }

          const firstMessage = fullThread.messages[0];
          const lastMessage = fullThread.messages[fullThread.messages.length - 1];
          const parsedFirst = parseGmailMessage(firstMessage, userEmail);
          const parsedLast = parseGmailMessage(lastMessage, userEmail);

          const participantsMap = new Map<string, { email: string; name?: string }>();
          for (const msg of fullThread.messages) {
            const parsed = parseGmailMessage(msg, userEmail);
            participantsMap.set(parsed.from.email, parsed.from);
            for (const recipient of parsed.to) {
              participantsMap.set(recipient.email, recipient);
            }
          }
          const participants = Array.from(participantsMap.values()).slice(0, 10);

          const labels = lastMessage.labelIds || [];
          const threadHasAttachments = fullThread.messages.some(
            (m) => parseGmailMessage(m, userEmail).attachments.length > 0
          );

          // Store/update thread
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
          console.error(`Failed to sync thread ${gmailThreadId}:`, err);
        }
      }

      // Update sync state
      await ctx.runMutation(internal.sync.mutations.updateSyncState, {
        userId: user._id,
        syncInProgress: false,
        isFullSync: false,
        historyId: history.historyId,
      });

      return {
        success: true,
        changes: syncedCount,
        message: `Synced ${syncedCount} changed threads`,
      };
    } catch (err) {
      // If history is invalid (e.g., too old), trigger full sync
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage.includes("404") || errorMessage.includes("historyId")) {
        await ctx.runMutation(internal.sync.mutations.updateSyncState, {
          userId: user._id,
          syncInProgress: false,
          isFullSync: false,
        });
        return { needsFullSync: true, message: "History expired, full sync required" };
      }

      await ctx.runMutation(internal.sync.mutations.updateSyncState, {
        userId: user._id,
        syncInProgress: false,
        isFullSync: false,
        syncError: errorMessage,
      });

      throw err;
    }
  },
});

/**
 * Smart sync - tries incremental first, falls back to full
 */
type SyncResult = { success?: boolean; needsFullSync?: boolean; skipped?: boolean; changes?: number; threadsSynced?: number; message?: string };

export const smartSync = action({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.sync.queries.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    // Get sync state
    const syncState = await ctx.runQuery(internal.sync.queries.getSyncState, {
      userId: user._id,
    });

    // If no history ID or never synced, do full sync
    if (!syncState?.historyId || !syncState.lastFullSyncAt) {
      return await ctx.runAction(internal.sync.gmail.fullSyncInternal, {
        clerkUserId: identity.subject,
      });
    }

    // Try incremental sync
    const result: SyncResult = await ctx.runAction(internal.sync.gmail.incrementalSyncInternal, {
      clerkUserId: identity.subject,
    });

    // If incremental sync says full sync needed, do it
    if (result.needsFullSync) {
      return await ctx.runAction(internal.sync.gmail.fullSyncInternal, {
        clerkUserId: identity.subject,
      });
    }

    return result;
  },
});

// Internal versions for cron/scheduled tasks
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const fullSyncInternal = internalAction({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; threadsSynced: number }> => {
    const user = await ctx.runQuery(internal.sync.queries.getUserByClerkId, {
      clerkId: args.clerkUserId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.runMutation(internal.sync.mutations.updateSyncState, {
      userId: user._id,
      syncInProgress: true,
      isFullSync: true,
    });

    try {
      const accessToken = await getGoogleOAuthToken(args.clerkUserId);
      const profile = await getGmailProfile(accessToken);
      const userEmail = profile.email;

      const threadList = await listGmailThreads(accessToken, 50);

      if (!threadList.threads || threadList.threads.length === 0) {
        await ctx.runMutation(internal.sync.mutations.updateSyncState, {
          userId: user._id,
          syncInProgress: false,
          isFullSync: true,
        });
        await ctx.runMutation(internal.sync.mutations.setGmailConnected, {
          userId: user._id,
          connected: true,
        });
        return { success: true, threadsSynced: 0 };
      }

      let syncedCount = 0;

      for (const threadRef of threadList.threads) {
        try {
          const fullThread = await getGmailThread(accessToken, threadRef.id);

          if (!fullThread.messages || fullThread.messages.length === 0) {
            continue;
          }

          const firstMessage = fullThread.messages[0];
          const lastMessage = fullThread.messages[fullThread.messages.length - 1];
          const parsedFirst = parseGmailMessage(firstMessage, userEmail);
          const parsedLast = parseGmailMessage(lastMessage, userEmail);

          const participantsMap = new Map<string, { email: string; name?: string }>();
          for (const msg of fullThread.messages) {
            const parsed = parseGmailMessage(msg, userEmail);
            participantsMap.set(parsed.from.email, parsed.from);
            for (const recipient of parsed.to) {
              participantsMap.set(recipient.email, recipient);
            }
          }
          const participants = Array.from(participantsMap.values()).slice(0, 10);

          const labels = lastMessage.labelIds || [];
          const threadHasAttachments = fullThread.messages.some(
            (m) => parseGmailMessage(m, userEmail).attachments.length > 0
          );

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
        }
      }

      await ctx.runMutation(internal.sync.mutations.updateSyncState, {
        userId: user._id,
        syncInProgress: false,
        isFullSync: true,
        historyId: threadList.threads[0]?.historyId,
      });

      await ctx.runMutation(internal.sync.mutations.setGmailConnected, {
        userId: user._id,
        connected: true,
      });

      return { success: true, threadsSynced: syncedCount };
    } catch (err) {
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

export const incrementalSyncInternal = internalAction({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args): Promise<{ success?: boolean; needsFullSync?: boolean; skipped?: boolean; changes?: number; message?: string }> => {
    const user = await ctx.runQuery(internal.sync.queries.getUserByClerkId, {
      clerkId: args.clerkUserId,
    });

    if (!user) {
      return { needsFullSync: true, message: "User not found" };
    }

    const syncState = await ctx.runQuery(internal.sync.queries.getSyncState, {
      userId: user._id,
    });

    if (!syncState?.historyId) {
      return { needsFullSync: true, message: "No history ID" };
    }

    if (syncState.syncInProgress) {
      return { skipped: true, message: "Sync in progress" };
    }

    await ctx.runMutation(internal.sync.mutations.updateSyncState, {
      userId: user._id,
      syncInProgress: true,
      isFullSync: false,
    });

    try {
      const accessToken = await getGoogleOAuthToken(args.clerkUserId);
      const profile = await getGmailProfile(accessToken);
      const userEmail = profile.email;

      const history = await getGmailHistory(accessToken, syncState.historyId);

      if (!history.history || history.history.length === 0) {
        await ctx.runMutation(internal.sync.mutations.updateSyncState, {
          userId: user._id,
          syncInProgress: false,
          isFullSync: false,
          historyId: history.historyId,
        });
        return { success: true, changes: 0 };
      }

      const changedThreadIds = new Set<string>();
      for (const entry of history.history) {
        for (const added of entry.messagesAdded || []) {
          changedThreadIds.add(added.message.threadId);
        }
        for (const labelChange of entry.labelsAdded || []) {
          changedThreadIds.add(labelChange.message.threadId);
        }
        for (const labelChange of entry.labelsRemoved || []) {
          changedThreadIds.add(labelChange.message.threadId);
        }
      }

      let syncedCount = 0;

      for (const gmailThreadId of changedThreadIds) {
        try {
          const fullThread = await getGmailThread(accessToken, gmailThreadId);

          if (!fullThread.messages || fullThread.messages.length === 0) {
            continue;
          }

          const firstMessage = fullThread.messages[0];
          const lastMessage = fullThread.messages[fullThread.messages.length - 1];
          const parsedFirst = parseGmailMessage(firstMessage, userEmail);
          const parsedLast = parseGmailMessage(lastMessage, userEmail);

          const participantsMap = new Map<string, { email: string; name?: string }>();
          for (const msg of fullThread.messages) {
            const parsed = parseGmailMessage(msg, userEmail);
            participantsMap.set(parsed.from.email, parsed.from);
            for (const recipient of parsed.to) {
              participantsMap.set(recipient.email, recipient);
            }
          }
          const participants = Array.from(participantsMap.values()).slice(0, 10);

          const labels = lastMessage.labelIds || [];
          const threadHasAttachments = fullThread.messages.some(
            (m) => parseGmailMessage(m, userEmail).attachments.length > 0
          );

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
          console.error(`Failed to sync thread ${gmailThreadId}:`, err);
        }
      }

      await ctx.runMutation(internal.sync.mutations.updateSyncState, {
        userId: user._id,
        syncInProgress: false,
        isFullSync: false,
        historyId: history.historyId,
      });

      return { success: true, changes: syncedCount };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage.includes("404") || errorMessage.includes("historyId")) {
        await ctx.runMutation(internal.sync.mutations.updateSyncState, {
          userId: user._id,
          syncInProgress: false,
          isFullSync: false,
        });
        return { needsFullSync: true };
      }

      await ctx.runMutation(internal.sync.mutations.updateSyncState, {
        userId: user._id,
        syncInProgress: false,
        isFullSync: false,
        syncError: errorMessage,
      });
      throw err;
    }
  },
});

/**
 * Load more emails from Gmail (pagination)
 * Fetches additional pages of threads from Gmail
 */
export const loadMoreEmails = action({
  args: {},
  handler: async (ctx): Promise<{ success?: boolean; skipped?: boolean; threadsSynced?: number; message?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.sync.queries.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    // Get current sync state to check for page token
    const syncState = await ctx.runQuery(internal.sync.queries.getSyncState, {
      userId: user._id,
    });

    // Check if sync is already in progress
    if (syncState?.syncInProgress) {
      return { skipped: true, message: "Sync already in progress" };
    }

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);
      const profile = await getGmailProfile(accessToken);
      const userEmail = profile.email;

      // Get the oldest thread we have to determine what to fetch
      const oldestThread = await ctx.runQuery(internal.sync.queries.getOldestThread, {
        userId: user._id,
      });

      // Fetch more threads - use a query to get older threads
      // We'll fetch threads without a specific page token but ask for more
      const params = new URLSearchParams({
        maxResults: "50",
        labelIds: "INBOX",
      });

      // If we have an oldest thread, query for threads before that date
      if (oldestThread) {
        const beforeDate = new Date(oldestThread.lastMessageAt);
        params.set("q", `before:${beforeDate.toISOString().split("T")[0]}`);
      }

      const threadList = await gmailFetch<GmailListResponse<{ id: string; historyId: string }>>(
        `/threads?${params}`,
        accessToken
      );

      if (!threadList.threads || threadList.threads.length === 0) {
        return { success: true, threadsSynced: 0, message: "No more threads" };
      }

      let syncedCount = 0;

      for (const threadRef of threadList.threads) {
        try {
          // Check if we already have this thread
          const existingThread = await ctx.runQuery(internal.sync.queries.getThreadByGmailId, {
            userId: user._id,
            gmailThreadId: threadRef.id,
          });

          if (existingThread) {
            continue; // Skip if already synced
          }

          const fullThread = await getGmailThread(accessToken, threadRef.id);

          if (!fullThread.messages || fullThread.messages.length === 0) {
            continue;
          }

          const firstMessage = fullThread.messages[0];
          const lastMessage = fullThread.messages[fullThread.messages.length - 1];
          const parsedFirst = parseGmailMessage(firstMessage, userEmail);
          const parsedLast = parseGmailMessage(lastMessage, userEmail);

          const participantsMap = new Map<string, { email: string; name?: string }>();
          for (const msg of fullThread.messages) {
            const parsed = parseGmailMessage(msg, userEmail);
            participantsMap.set(parsed.from.email, parsed.from);
            for (const recipient of parsed.to) {
              participantsMap.set(recipient.email, recipient);
            }
          }
          const participants = Array.from(participantsMap.values()).slice(0, 10);

          const labels = lastMessage.labelIds || [];
          const threadHasAttachments = fullThread.messages.some(
            (m) => parseGmailMessage(m, userEmail).attachments.length > 0
          );

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
        }
      }

      return {
        success: true,
        threadsSynced: syncedCount,
        message: `Loaded ${syncedCount} more threads`,
      };
    } catch (err) {
      console.error("Failed to load more emails:", err);
      throw err;
    }
  },
});

// Export gmailFetch for use by other modules
export { gmailFetch };
