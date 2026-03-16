import type { Id } from "../../convex/_generated/dataModel";

export interface Participant {
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Thread {
  _id: Id<"threads">;
  userId: Id<"users">;
  gmailThreadId: string;
  subject: string;
  snippet: string;
  participants: Participant[];
  messageCount: number;
  lastMessageAt: number;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  hasAttachments: boolean;
  labels: string[];
  category?: "primary" | "social" | "promotions" | "updates";
}

export interface Message {
  _id: Id<"messages">;
  userId: Id<"users">;
  threadId: Id<"threads">;
  gmailMessageId: string;
  from: Participant;
  to: Participant[];
  cc?: Participant[];
  subject: string;
  bodyPlain?: string;
  bodyHtml?: string;
  bodyFetchedAt?: number; // When body content was last fetched from Gmail
  snippet: string;
  sentAt: number;
  attachments: Attachment[];
  isIncoming: boolean;
}

export interface Contact {
  _id: Id<"contacts">;
  userId: Id<"users">;
  email: string;
  name?: string;
  avatarUrl?: string;
  emailCount: number;
  lastEmailedAt?: number;
}

export interface Draft {
  _id: Id<"drafts">;
  userId: Id<"users">;
  replyToThreadId?: Id<"threads">;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  updatedAt: number;
}

export type EmailCategory = "primary" | "social" | "promotions" | "updates";

export interface EmailFilter {
  category?: EmailCategory;
  isStarred?: boolean;
  isUnread?: boolean;
  isArchived?: boolean;
  searchQuery?: string;
}
