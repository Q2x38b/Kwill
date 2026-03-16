"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type {
  GmailThread,
  GmailMessage,
  GmailListResponse,
  GmailHistoryResponse,
} from "../lib/gmail_types";
import {
  parseGmailMessage,
  isEmailRead,
  isEmailStarred,
  isEmailArchived,
  isEmailTrashed,
  getCategoryFromLabels,
  hasAttachments,
} from "../lib/gmail_parser";

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
