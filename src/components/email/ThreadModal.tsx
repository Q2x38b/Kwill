import { useRef, useEffect, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronUp,
  ChevronDown,
  Archive,
  Trash2,
  Star,
  Reply,
  Forward,
  MoreHorizontal,
  Printer,
  BellOff,
  Loader2,
  Tag,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Thread, Message } from "@/types/email";
import { EmailMessage } from "./EmailMessage";
import { EmailComposer } from "./EmailComposer";
import { Button } from "@/components/ui/button";
import { useEmailActions } from "@/hooks/useEmailActions";
import { cn } from "@/lib/utils";

interface ThreadModalProps {
  threadId: Id<"threads">;
  thread: Thread;
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function ThreadModal({
  threadId,
  thread,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
}: ThreadModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const messages = (useQuery(api.emails.queries.getMessages, { threadId }) ?? []) as Message[];
  const { archive, moveToTrash, toggleStar, markAsRead } = useEmailActions();
  const fetchThreadContent = useAction(api.emails.actions.fetchThreadContent);

  // Fetch message content if not cached
  useEffect(() => {
    const needsContent = messages.some((m) => !m.bodyFetchedAt && !m.bodyHtml && !m.bodyPlain);
    if (needsContent && messages.length > 0 && !isLoadingContent) {
      setIsLoadingContent(true);
      fetchThreadContent({ threadId })
        .catch((err) => console.error("Failed to fetch thread content:", err))
        .finally(() => setIsLoadingContent(false));
    }
  }, [threadId, messages, fetchThreadContent, isLoadingContent]);

  // Mark thread as read when viewed
  useEffect(() => {
    if (!thread.isRead) {
      markAsRead(threadId, true);
    }
  }, [threadId, thread.isRead, markAsRead]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        if (hasPrev && onNavigatePrev) {
          e.preventDefault();
          onNavigatePrev();
        }
      } else if (e.key === "ArrowDown" || e.key === "j") {
        if (hasNext && onNavigateNext) {
          e.preventDefault();
          onNavigateNext();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigatePrev, onNavigateNext, hasPrev, hasNext]);

  // Auto-scroll to top when thread changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [threadId]);

  const handleArchive = async () => {
    await archive(threadId);
    onClose();
  };

  const handleDelete = async () => {
    await moveToTrash(threadId);
    onClose();
  };

  const latestMessage = messages[messages.length - 1];

  // Get category label for display
  const categoryLabel = thread.category
    ? thread.category.charAt(0).toUpperCase() + thread.category.slice(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with navigation and actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
          {/* Left: Close and navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="w-px h-5 bg-[var(--border)] mx-1" />

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNavigatePrev}
              disabled={!hasPrev}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNavigateNext}
              disabled={!hasNext}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <BellOff className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleArchive}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Subject and labels */}
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            {thread.subject}
          </h1>
          <div className="flex items-center gap-2">
            <button className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Add label
            </button>
            {categoryLabel && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--secondary)] text-[var(--foreground)] flex items-center gap-1">
                {categoryLabel}
                <X className="h-3 w-3 opacity-50 hover:opacity-100 cursor-pointer" />
              </span>
            )}
          </div>
        </div>

        {/* Loading indicator */}
        {isLoadingContent && (
          <div className="flex items-center justify-center gap-2 py-2 bg-[var(--accent)] text-sm text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading email content...
          </div>
        )}

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.24,
                    ease: [0.22, 1, 0.36, 1],
                    delay: index * 0.05,
                  }}
                >
                  <EmailMessage message={message} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left actions */}
            <div className="flex items-center gap-1">
              <ActionButton
                icon={Archive}
                label="Archive"
                onClick={handleArchive}
              />
              <ActionButton
                icon={Trash2}
                label="Delete"
                onClick={handleDelete}
              />
              <ActionButton
                icon={Star}
                label={thread.isStarred ? "Unstar" : "Star"}
                onClick={() => toggleStar(threadId)}
                active={thread.isStarred}
              />
              <ActionButton
                icon={Forward}
                label="Forward"
                onClick={() => {}}
              />
            </div>

            {/* Reply button */}
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={() => setShowComposer(true)}
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
          </div>
        </div>

        {/* Composer overlay */}
        <AnimatePresence>
          {showComposer && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-0 bg-[var(--card)] border-t border-[var(--border)] shadow-lg rounded-t-2xl z-50 max-h-[60%] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-sm font-medium">
                  Reply to {latestMessage?.from.name || latestMessage?.from.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowComposer(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <EmailComposer
                threadId={threadId}
                replyTo={latestMessage}
                onSend={() => setShowComposer(false)}
                onCancel={() => setShowComposer(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: typeof Archive;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors",
        active && "text-yellow-500"
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className={cn("h-4 w-4", active && "fill-current")} />
    </motion.button>
  );
}
