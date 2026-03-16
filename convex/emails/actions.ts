"use node";

declare const process: { env: Record<string, string | undefined> };

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Get Google OAuth token from Clerk Backend API
 */
async function getGoogleOAuthToken(clerkUserId: string): Promise<string> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY environment variable not set");
  }

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
    throw new Error("No Google OAuth token found.");
  }

  return tokens[0].token;
}

/**
 * Make authenticated Gmail API request
 */
async function gmailFetch(
  endpoint: string,
  accessToken: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${GMAIL_API_BASE}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

/**
 * Modify Gmail thread labels
 */
async function modifyThreadLabels(
  accessToken: string,
  threadId: string,
  addLabels: string[],
  removeLabels: string[]
): Promise<void> {
  const response = await gmailFetch(
    `/threads/${threadId}/modify`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        addLabelIds: addLabels,
        removeLabelIds: removeLabels,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to modify thread: ${response.status} - ${error}`);
  }
}

/**
 * Archive thread in Gmail (remove INBOX label)
 */
export const archiveThread = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get thread from database
    const thread = await ctx.runQuery(internal.emails.internalQueries.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    try {
      // Archive in Gmail
      const accessToken = await getGoogleOAuthToken(identity.subject);
      await modifyThreadLabels(accessToken, thread.gmailThreadId, [], ["INBOX"]);
    } catch (err) {
      console.error("Failed to archive in Gmail:", err);
      // Continue to update local state even if Gmail sync fails
    }

    // Update local database
    await ctx.runMutation(internal.emails.internalMutations.archiveThread, {
      threadId: args.threadId,
    });

    return { success: true };
  },
});

/**
 * Unarchive thread (add INBOX label back)
 */
export const unarchiveThread = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.runQuery(internal.emails.internalQueries.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);
      await modifyThreadLabels(accessToken, thread.gmailThreadId, ["INBOX"], []);
    } catch (err) {
      console.error("Failed to unarchive in Gmail:", err);
    }

    await ctx.runMutation(internal.emails.internalMutations.unarchiveThread, {
      threadId: args.threadId,
    });

    return { success: true };
  },
});

/**
 * Move thread to trash in Gmail
 */
export const trashThread = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.runQuery(internal.emails.internalQueries.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);
      const response = await gmailFetch(
        `/threads/${thread.gmailThreadId}/trash`,
        accessToken,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to trash thread: ${response.status} - ${error}`);
      }
    } catch (err) {
      console.error("Failed to trash in Gmail:", err);
    }

    await ctx.runMutation(internal.emails.internalMutations.trashThread, {
      threadId: args.threadId,
    });

    return { success: true };
  },
});

/**
 * Restore thread from trash
 */
export const untrashThread = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.runQuery(internal.emails.internalQueries.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);
      const response = await gmailFetch(
        `/threads/${thread.gmailThreadId}/untrash`,
        accessToken,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to untrash thread: ${response.status} - ${error}`);
      }
    } catch (err) {
      console.error("Failed to untrash in Gmail:", err);
    }

    await ctx.runMutation(internal.emails.internalMutations.untrashThread, {
      threadId: args.threadId,
    });

    return { success: true };
  },
});

/**
 * Star/unstar thread in Gmail
 */
export const toggleStar = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; isStarred: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.runQuery(internal.emails.internalQueries.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    const newStarred = !thread.isStarred;

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);
      if (newStarred) {
        await modifyThreadLabels(accessToken, thread.gmailThreadId, ["STARRED"], []);
      } else {
        await modifyThreadLabels(accessToken, thread.gmailThreadId, [], ["STARRED"]);
      }
    } catch (err) {
      console.error("Failed to toggle star in Gmail:", err);
    }

    await ctx.runMutation(internal.emails.internalMutations.toggleStar, {
      threadId: args.threadId,
    });

    return { success: true, isStarred: newStarred };
  },
});

/**
 * Mark thread as read/unread in Gmail
 */
export const markAsRead = action({
  args: {
    threadId: v.id("threads"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.runQuery(internal.emails.internalQueries.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);
      if (args.isRead) {
        // Remove UNREAD label
        await modifyThreadLabels(accessToken, thread.gmailThreadId, [], ["UNREAD"]);
      } else {
        // Add UNREAD label
        await modifyThreadLabels(accessToken, thread.gmailThreadId, ["UNREAD"], []);
      }
    } catch (err) {
      console.error("Failed to mark as read in Gmail:", err);
    }

    await ctx.runMutation(internal.emails.internalMutations.markAsRead, {
      threadId: args.threadId,
      isRead: args.isRead,
    });

    return { success: true };
  },
});
