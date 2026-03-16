import { motion } from "framer-motion";
import { FileText, Image, Download, Eye, Paperclip } from "lucide-react";
import type { Message, Attachment } from "@/types/email";
import { cn, formatRelativeTime } from "@/lib/utils";

interface EmailMessageProps {
  message: Message;
}

export function EmailMessage({ message }: EmailMessageProps) {
  const senderName = message.from.name || message.from.email;
  const senderEmail = message.from.email;

  return (
    <div className="email-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">{senderName}</span>
          <span className="text-[var(--muted-foreground)] text-sm">
            {senderEmail}
          </span>
          <span className="text-[var(--muted-foreground)] text-sm">
            · {formatRelativeTime(message.sentAt)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "prose prose-sm max-w-none text-[var(--foreground)]",
          "prose-p:my-3 prose-p:leading-relaxed",
          "prose-strong:font-semibold",
          "prose-a:text-[var(--primary)] prose-a:no-underline hover:prose-a:underline"
        )}
      >
        {message.bodyHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
          />
        ) : (
          <div className="whitespace-pre-wrap">{message.bodyPlain || message.snippet}</div>
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
