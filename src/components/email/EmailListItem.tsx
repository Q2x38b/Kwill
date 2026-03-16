import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, Trash2, Star, Mail, MailOpen, Paperclip } from "lucide-react";
import { SwipeableItem, type SwipeAction } from "@/components/common/SwipeableItem";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useEmailActions } from "@/hooks/useEmailActions";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Thread } from "@/types/email";

interface EmailListItemProps {
  thread: Thread;
  onClick: () => void;
}

const deleteAction: SwipeAction = {
  icon: Trash2,
  color: "#ffffff",
  bgColor: "oklch(55% 0.2 25)",
  label: "Delete",
};

const archiveAction: SwipeAction = {
  icon: Archive,
  color: "#ffffff",
  bgColor: "oklch(65% 0.2 145)",
  label: "Archive",
};

export function EmailListItem({ thread, onClick }: EmailListItemProps) {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const { markAsRead, toggleStar, archive, moveToTrash } = useEmailActions();

  const sender = thread.participants[0];
  const senderEmail = sender?.email || "Unknown";

  const handleSwipeLeft = () => {
    moveToTrash(thread._id);
  };

  const handleSwipeRight = () => {
    archive(thread._id);
  };

  const content = (
    <motion.div
      className={cn(
        "email-card group relative p-4 cursor-pointer",
        !thread.isRead && "ring-1 ring-[var(--primary)]/20 bg-[var(--primary)]/[0.02]"
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Top row: Subject + Time/Actions */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3
          className={cn(
            "text-[15px] leading-tight truncate flex-1",
            !thread.isRead ? "font-semibold text-[var(--foreground)]" : "font-medium text-[var(--foreground)]"
          )}
        >
          {thread.subject || "(No Subject)"}
        </h3>

        {/* Time / Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <AnimatePresence mode="wait">
            {isHovered && !isMobile ? (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-0.5"
              >
                <ActionButton
                  icon={Archive}
                  label="Archive"
                  onClick={(e) => {
                    e.stopPropagation();
                    archive(thread._id);
                  }}
                />
                <ActionButton
                  icon={Trash2}
                  label="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveToTrash(thread._id);
                  }}
                />
                <ActionButton
                  icon={thread.isRead ? Mail : MailOpen}
                  label={thread.isRead ? "Mark unread" : "Mark read"}
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(thread._id, !thread.isRead);
                  }}
                />
                <ActionButton
                  icon={Star}
                  label={thread.isStarred ? "Unstar" : "Star"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(thread._id);
                  }}
                  active={thread.isStarred}
                />
              </motion.div>
            ) : (
              <motion.span
                key="time"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-[var(--muted-foreground)] whitespace-nowrap"
              >
                {formatRelativeTime(thread.lastMessageAt)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sender email + indicators */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm text-[var(--muted-foreground)] truncate">
          {senderEmail}
        </span>
        {thread.messageCount > 1 && (
          <span className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary)] px-1.5 py-0.5 rounded-md shrink-0">
            {thread.messageCount}
          </span>
        )}
        {thread.isStarred && (
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
        )}
        {thread.hasAttachments && (
          <Paperclip className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
        )}
      </div>

      {/* Snippet */}
      <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
        {thread.snippet}
      </p>

      {/* Unread indicator dot */}
      {!thread.isRead && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
      )}
    </motion.div>
  );

  if (isMobile) {
    return (
      <SwipeableItem
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        leftAction={deleteAction}
        rightAction={archiveAction}
      >
        {content}
      </SwipeableItem>
    );
  }

  return content;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: typeof Star;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all duration-fast",
        active && "text-yellow-500"
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className={cn("h-4 w-4", active && "fill-current")} />
    </motion.button>
  );
}
