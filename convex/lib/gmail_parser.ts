import type {
  GmailMessage,
  GmailMessagePart,
  GmailHeader,
  ParsedEmail,
} from "./gmail_types";
import { mapGmailCategoryToApp } from "./gmail_types";

/**
 * Parse an email address string like "John Doe <john@example.com>"
 * into { name, email } format
 */
export function parseEmailAddress(
  raw: string
): { email: string; name?: string } {
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^<>]+)>?$/);
  if (match) {
    const [, name, email] = match;
    return {
      email: email.trim().toLowerCase(),
      name: name?.trim() || undefined,
    };
  }
  return { email: raw.trim().toLowerCase() };
}

/**
 * Parse multiple email addresses from a comma-separated string
 */
export function parseEmailAddresses(
  raw: string
): { email: string; name?: string }[] {
  if (!raw) return [];

  // Split by comma, but not commas inside quotes
  const addresses: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of raw) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "," && !inQuotes) {
      if (current.trim()) {
        addresses.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    addresses.push(current.trim());
  }

  return addresses.map(parseEmailAddress);
}

/**
 * Get a header value from Gmail message headers
 */
function getHeader(headers: GmailHeader[], name: string): string | undefined {
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value;
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  // Replace base64url characters with standard base64
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  // Decode
  try {
    return atob(padded);
  } catch {
    return "";
  }
}

/**
 * Extract body content from message parts recursively
 */
function extractBodyFromParts(
  parts: GmailMessagePart[],
  preferredType: "text/plain" | "text/html"
): string | undefined {
  // First, look for the preferred type
  for (const part of parts) {
    if (part.mimeType === preferredType && part.body.data) {
      return decodeBase64Url(part.body.data);
    }

    // Check nested parts (multipart messages)
    if (part.parts) {
      const nested = extractBodyFromParts(part.parts, preferredType);
      if (nested) return nested;
    }
  }

  // If preferred not found, look for alternative
  const fallbackType =
    preferredType === "text/plain" ? "text/html" : "text/plain";
  for (const part of parts) {
    if (part.mimeType === fallbackType && part.body.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      const nested = extractBodyFromParts(part.parts, fallbackType);
      if (nested) return nested;
    }
  }

  return undefined;
}

/**
 * Extract attachments from message parts
 */
function extractAttachments(
  parts: GmailMessagePart[]
): ParsedEmail["attachments"] {
  const attachments: ParsedEmail["attachments"] = [];

  function processparts(partsList: GmailMessagePart[]) {
    for (const part of partsList) {
      // Check if this is an attachment
      if (part.filename && part.body.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
        });
      }

      // Process nested parts
      if (part.parts) {
        processparts(part.parts);
      }
    }
  }

  processparts(parts);
  return attachments;
}

/**
 * Parse a Gmail API message into our ParsedEmail format
 */
export function parseGmailMessage(
  message: GmailMessage,
  userEmail: string
): ParsedEmail {
  const { payload, snippet, labelIds, internalDate } = message;
  const headers = payload.headers;

  // Extract headers
  const fromRaw = getHeader(headers, "From") || "";
  const toRaw = getHeader(headers, "To") || "";
  const ccRaw = getHeader(headers, "Cc");
  const bccRaw = getHeader(headers, "Bcc");
  const subject = getHeader(headers, "Subject") || "(No Subject)";
  const dateHeader = getHeader(headers, "Date");

  // Parse addresses
  const from = parseEmailAddress(fromRaw);
  const to = parseEmailAddresses(toRaw);
  const cc = ccRaw ? parseEmailAddresses(ccRaw) : undefined;
  const bcc = bccRaw ? parseEmailAddresses(bccRaw) : undefined;

  // Determine if incoming
  const isIncoming = from.email.toLowerCase() !== userEmail.toLowerCase();

  // Extract body
  let bodyPlain: string | undefined;
  let bodyHtml: string | undefined;

  if (payload.parts) {
    bodyPlain = extractBodyFromParts(payload.parts, "text/plain");
    bodyHtml = extractBodyFromParts(payload.parts, "text/html");
  } else if (payload.body.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") {
      bodyHtml = decoded;
    } else {
      bodyPlain = decoded;
    }
  }

  // Extract attachments
  const attachments = payload.parts ? extractAttachments(payload.parts) : [];

  // Parse dates
  const sentAt = dateHeader
    ? new Date(dateHeader).getTime()
    : parseInt(internalDate, 10);
  const receivedAt = parseInt(internalDate, 10);

  return {
    from,
    to,
    cc,
    bcc,
    subject,
    bodyPlain,
    bodyHtml,
    snippet,
    sentAt,
    receivedAt,
    attachments,
    isIncoming,
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    labels: labelIds || [],
  };
}

/**
 * Determine email category from labels
 */
export function getCategoryFromLabels(
  labels: string[]
): "primary" | "social" | "promotions" | "updates" | undefined {
  return mapGmailCategoryToApp(labels);
}

/**
 * Check if email is read from labels
 */
export function isEmailRead(labels: string[]): boolean {
  return !labels.includes("UNREAD");
}

/**
 * Check if email is starred from labels
 */
export function isEmailStarred(labels: string[]): boolean {
  return labels.includes("STARRED");
}

/**
 * Check if email is archived (not in INBOX)
 */
export function isEmailArchived(labels: string[]): boolean {
  return !labels.includes("INBOX");
}

/**
 * Check if email is trashed
 */
export function isEmailTrashed(labels: string[]): boolean {
  return labels.includes("TRASH");
}

/**
 * Check if email has attachments
 */
export function hasAttachments(attachments: ParsedEmail["attachments"]): boolean {
  return attachments.length > 0;
}
