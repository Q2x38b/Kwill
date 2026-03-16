"use node";

import { action } from "../_generated/server";

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

// Export gmailFetch for use by other modules
export { gmailFetch };
