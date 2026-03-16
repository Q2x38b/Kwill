import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Image, Download, Eye, Paperclip } from "lucide-react";
import DOMPurify from "dompurify";
import type { Message, Attachment } from "@/types/email";
import { cn, formatRelativeTime, getInitials, generateAvatarColor } from "@/lib/utils";

interface EmailMessageProps {
  message: Message;
}

// Configure DOMPurify for email HTML
// Block tracking pixels and upgrade HTTP to HTTPS
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "src" && node.tagName === "IMG") {
    const src = data.attrValue;
    // Block tracking pixels (1x1 images, common tracking domains)
    if (
      src.includes("track") ||
      src.includes("pixel") ||
      src.includes("beacon") ||
      src.includes("open.gif") ||
      src.includes("o.gif") ||
      src.includes("/imp?") ||
      src.includes("/e_id") ||
      src.includes("UCMController") ||
      src.match(/\.(gif|png)\?.*[&?](mi_|e_id|adcampaign|dtm_)/)
    ) {
      data.attrValue = "";
      return;
    }
    // Upgrade HTTP to HTTPS to avoid mixed content warnings
    if (src.startsWith("http://")) {
      data.attrValue = src.replace("http://", "https://");
    }
  }
});

const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a", "b", "i", "u", "em", "strong", "p", "br", "div", "span",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "hr", "font", "center", "small", "sup", "sub",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "style", "target",
      "width", "height", "align", "valign", "border", "cellpadding", "cellspacing",
      "color", "bgcolor", "face", "size",
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
};

export function EmailMessage({ message }: EmailMessageProps) {
  const senderName = message.from.name || message.from.email;
  const senderEmail = message.from.email;

  // Sanitize HTML content
  const sanitizedHtml = useMemo(() => {
    if (!message.bodyHtml) return null;
    return sanitizeHtml(message.bodyHtml);
  }, [message.bodyHtml]);

  const avatarColor = generateAvatarColor(senderEmail);
  const initials = getInitials(message.from.name, senderEmail);

  return (
    <div className="email-card p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>

        {/* Sender info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{senderName}</span>
            {senderName !== senderEmail && (
              <span className="text-[var(--muted-foreground)] text-sm truncate">
                &lt;{senderEmail}&gt;
              </span>
            )}
          </div>
          <span className="text-[var(--muted-foreground)] text-sm">
            {formatRelativeTime(message.sentAt)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "email-body prose prose-sm max-w-none",
          "text-[var(--foreground)]",
          "prose-p:my-2 prose-p:leading-relaxed",
          "prose-strong:font-semibold prose-strong:text-[var(--foreground)]",
          "prose-a:text-[var(--primary)] prose-a:no-underline hover:prose-a:underline",
          "prose-headings:text-[var(--foreground)] prose-headings:font-semibold",
          "prose-blockquote:border-l-[var(--border)] prose-blockquote:text-[var(--muted-foreground)]",
          "prose-code:text-[var(--foreground)] prose-code:bg-[var(--accent)]",
          "prose-pre:bg-[var(--accent)] prose-pre:text-[var(--foreground)]",
          "prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg",
          "prose-table:border-collapse prose-td:border prose-td:border-[var(--border)] prose-td:p-2",
          "prose-th:border prose-th:border-[var(--border)] prose-th:p-2 prose-th:bg-[var(--accent)]",
          "[&_*]:max-w-full"
        )}
      >
        {sanitizedHtml ? (
          // Wrap HTML emails in a light-mode container since external emails
          // typically have dark text with inline styles that don't adapt to dark mode
          <div
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            className="break-words email-html-content bg-white text-gray-900 rounded-lg p-4 -mx-4"
            style={{
              // Force readable colors for injected HTML with inline styles
              colorScheme: "light",
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.bodyPlain || message.snippet}
          </div>
        )}
      </div>

      {/* Attachments */}
      {message.attachments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[var(--border)]">
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
            Attachments
          </p>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentChip key={attachment.id} attachment={attachment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const fileExtension = attachment.filename.split(".").pop()?.toUpperCase() || "FILE";
  const fileSize = formatFileSize(attachment.size);
  const isImage = attachment.mimeType.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-3 px-3 py-2 bg-[var(--accent)] rounded-lg cursor-pointer group"
    >
      {/* File icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded bg-[var(--secondary)]">
        {isImage ? (
          <Image className="h-4 w-4 text-[var(--muted-foreground)]" />
        ) : isPdf ? (
          <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
        ) : (
          <Paperclip className="h-4 w-4 text-[var(--muted-foreground)]" />
        )}
      </div>

      {/* File info */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{fileExtension}</span>
        <span className="text-xs text-[var(--muted-foreground)]">{fileSize}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 rounded hover:bg-[var(--secondary)] transition-colors"
          title="Preview"
        >
          <Eye className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-[var(--secondary)] transition-colors"
          title="Download"
        >
          <Download className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </button>
      </div>
    </motion.div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
