// Gmail API types
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: GmailMessagePayload;
  sizeEstimate: number;
  raw?: string;
}

export interface GmailMessagePayload {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body: GmailMessageBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body: GmailMessageBody;
  parts?: GmailMessagePart[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageBody {
  attachmentId?: string;
  size: number;
  data?: string;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

export interface GmailListResponse<T> {
  messages?: T[];
  threads?: T[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailHistoryResponse {
  history?: GmailHistoryRecord[];
  historyId: string;
  nextPageToken?: string;
}

export interface GmailHistoryRecord {
  id: string;
  messages?: GmailMessage[];
  messagesAdded?: { message: GmailMessage }[];
  messagesDeleted?: { message: GmailMessage }[];
  labelsAdded?: { message: GmailMessage; labelIds: string[] }[];
  labelsRemoved?: { message: GmailMessage; labelIds: string[] }[];
}

export interface ParsedEmail {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  subject: string;
  bodyPlain?: string;
  bodyHtml?: string;
  snippet: string;
  sentAt: number;
  receivedAt: number;
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
  isIncoming: boolean;
  gmailMessageId: string;
  gmailThreadId: string;
  labels: string[];
}

// Gmail category labels
export const GMAIL_CATEGORIES = {
  PRIMARY: "CATEGORY_PERSONAL",
  SOCIAL: "CATEGORY_SOCIAL",
  PROMOTIONS: "CATEGORY_PROMOTIONS",
  UPDATES: "CATEGORY_UPDATES",
  FORUMS: "CATEGORY_FORUMS",
} as const;

export type GmailCategory = keyof typeof GMAIL_CATEGORIES;

export function mapGmailCategoryToApp(
  labels: string[]
): "primary" | "social" | "promotions" | "updates" | undefined {
  if (labels.includes(GMAIL_CATEGORIES.SOCIAL)) return "social";
  if (labels.includes(GMAIL_CATEGORIES.PROMOTIONS)) return "promotions";
  if (labels.includes(GMAIL_CATEGORIES.UPDATES)) return "updates";
  if (labels.includes(GMAIL_CATEGORIES.PRIMARY)) return "primary";
  return undefined;
}
