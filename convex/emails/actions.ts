"use node";

declare const process: { env: Record<string, string | undefined> };
declare const Buffer: {
  from(str: string, encoding?: string): { toString(encoding: string): string };
};

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

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

    const thread: Doc<"threads"> | null = await ctx.runQuery(internal.emails.internalQueries.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    const newStarred: boolean = !thread.isStarred;

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

/**
 * Fetch message content from Gmail (on-demand loading)
 * This fetches the full body content and caches it in the database
 */
export const fetchMessageContent = action({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; bodyPlain?: string; bodyHtml?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get message from database
    const message = await ctx.runQuery(internal.emails.internalQueries.getMessageById, {
      messageId: args.messageId,
    });

    if (!message) {
      throw new Error("Message not found");
    }

    // If body is already fetched and cached, return it
    if (message.bodyFetchedAt && (message.bodyPlain || message.bodyHtml)) {
      return {
        success: true,
        bodyPlain: message.bodyPlain,
        bodyHtml: message.bodyHtml,
      };
    }

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);

      // Fetch message from Gmail
      const response = await gmailFetch(
        `/messages/${message.gmailMessageId}?format=full`,
        accessToken
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch message: ${response.status} - ${error}`);
      }

      const gmailMessage = await response.json();

      // Parse the message body
      const { bodyPlain, bodyHtml } = parseMessageBody(gmailMessage);

      // Cache the body in the database
      await ctx.runMutation(internal.emails.internalMutations.cacheMessageBody, {
        messageId: args.messageId,
        bodyPlain,
        bodyHtml,
      });

      return {
        success: true,
        bodyPlain,
        bodyHtml,
      };
    } catch (err) {
      console.error("Failed to fetch message content:", err);
      throw err;
    }
  },
});

/**
 * Fetch all message contents for a thread
 */
export const fetchThreadContent = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; fetchedCount: number }> => {
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

    // Get messages that need body content
    const messages = await ctx.runQuery(internal.emails.internalQueries.getMessagesNeedingContent, {
      threadId: args.threadId,
    });

    if (messages.length === 0) {
      return { success: true, fetchedCount: 0 };
    }

    try {
      const accessToken = await getGoogleOAuthToken(identity.subject);

      // Fetch full thread from Gmail (more efficient than individual messages)
      const response = await gmailFetch(
        `/threads/${thread.gmailThreadId}?format=full`,
        accessToken
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch thread: ${response.status} - ${error}`);
      }

      const gmailThread = await response.json();
      let fetchedCount = 0;

      // Match Gmail messages to our database messages and cache bodies
      for (const gmailMsg of gmailThread.messages || []) {
        const localMsg = messages.find((m) => m.gmailMessageId === gmailMsg.id);
        if (localMsg) {
          const { bodyPlain, bodyHtml } = parseMessageBody(gmailMsg);

          await ctx.runMutation(internal.emails.internalMutations.cacheMessageBody, {
            messageId: localMsg._id,
            bodyPlain,
            bodyHtml,
          });

          fetchedCount++;
        }
      }

      return { success: true, fetchedCount };
    } catch (err) {
      console.error("Failed to fetch thread content:", err);
      throw err;
    }
  },
});

/**
 * Send an email via Gmail API
 */
export const sendEmail = action({
  args: {
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    body: v.string(),
    replyToMessageId: v.optional(v.string()),
    replyToThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; messageId?: string; threadId?: string; error?: string }> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { success: false, error: "Not authenticated" };
      }

      const accessToken = await getGoogleOAuthToken(identity.subject);

      // Get user's email for the From header
      const profileResponse = await gmailFetch("/profile", accessToken);
      if (!profileResponse.ok) {
        const error = await profileResponse.text();
        return { success: false, error: `Failed to get Gmail profile: ${error}` };
      }
      const profile = await profileResponse.json();
      const userEmail = profile.emailAddress;

      // Build MIME message
      const mimeMessage = buildMimeMessage({
        from: userEmail,
        to: args.to,
        cc: args.cc,
        bcc: args.bcc,
        subject: args.subject,
        body: args.body,
        replyToMessageId: args.replyToMessageId,
      });

      // Encode to base64url using Buffer (Node.js compatible)
      const encodedMessage = Buffer.from(mimeMessage, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Build request body
      const requestBody: { raw: string; threadId?: string } = { raw: encodedMessage };
      if (args.replyToThreadId) {
        requestBody.threadId = args.replyToThreadId;
      }

      // Send via Gmail API
      const response = await gmailFetch("/messages/send", accessToken, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Gmail send error:", error);
        return { success: false, error: `Failed to send email: ${response.status} - ${error}` };
      }

      const result = await response.json();

      // Trigger a sync to update local state with the sent message
      try {
        await ctx.runAction(internal.sync.gmail.incrementalSyncInternal, {
          clerkUserId: identity.subject,
        });
      } catch (syncError) {
        console.log("Post-send sync failed (non-fatal):", syncError);
      }

      return {
        success: true,
        messageId: result.id,
        threadId: result.threadId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to send email:", errorMessage);
      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Build a MIME message for Gmail API
 */
function buildMimeMessage(args: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  replyToMessageId?: string;
}): string {
  const lines: string[] = [];

  // Headers
  lines.push(`From: ${args.from}`);
  lines.push(`To: ${args.to.join(", ")}`);

  if (args.cc && args.cc.length > 0) {
    lines.push(`Cc: ${args.cc.join(", ")}`);
  }

  if (args.bcc && args.bcc.length > 0) {
    lines.push(`Bcc: ${args.bcc.join(", ")}`);
  }

  // Encode subject for UTF-8 support using Buffer (Node.js compatible)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(args.subject, "utf-8").toString("base64")}?=`;
  lines.push(`Subject: ${encodedSubject}`);

  // Reply headers
  if (args.replyToMessageId) {
    lines.push(`In-Reply-To: ${args.replyToMessageId}`);
    lines.push(`References: ${args.replyToMessageId}`);
  }

  lines.push("MIME-Version: 1.0");
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push(""); // Empty line before body
  lines.push(args.body);

  return lines.join("\r\n");
}

/**
 * Parse message body from Gmail API response
 */
function parseMessageBody(gmailMessage: {
  payload?: {
    mimeType?: string;
    body?: { data?: string };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<{
        mimeType?: string;
        body?: { data?: string };
      }>;
    }>;
  };
}): { bodyPlain?: string; bodyHtml?: string } {
  let bodyPlain: string | undefined;
  let bodyHtml: string | undefined;

  const payload = gmailMessage.payload;
  if (!payload) return { bodyPlain, bodyHtml };

  // Helper to decode base64url using Buffer (Node.js compatible)
  const decodeBase64 = (data: string): string => {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  };

  // Helper to extract body from parts
  const extractFromParts = (parts: typeof payload.parts): void => {
    if (!parts) return;

    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data && !bodyPlain) {
        bodyPlain = decodeBase64(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data && !bodyHtml) {
        bodyHtml = decodeBase64(part.body.data);
      } else if (part.parts) {
        extractFromParts(part.parts);
      }
    }
  };

  // Check if body is directly in payload
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    bodyPlain = decodeBase64(payload.body.data);
  } else if (payload.mimeType === "text/html" && payload.body?.data) {
    bodyHtml = decodeBase64(payload.body.data);
  } else if (payload.parts) {
    extractFromParts(payload.parts);
  }

  return { bodyPlain, bodyHtml };
}
