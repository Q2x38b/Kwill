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

// Truncate email to show domain
function formatSender(email: string, name?: string): string {
  if (name && name !== email) {
    // Truncate long names
    return name.length > 20 ? name.slice(0, 18) + "..." : name;
  }
  // Truncate email, keeping domain visible
  if (email.length > 22) {
    const [local, domain] = email.split("@");
    if (domain) {
      const truncatedLocal = local.slice(0, 10) + "...";
      return `${truncatedLocal}@${domain.slice(0, 8)}${domain.length > 8 ? "..." : ""}`;
    }
    return email.slice(0, 20) + "...";
  }
  return email;
}

export function EmailListItem({ thread, onClick }: EmailListItemProps) {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const { markAsRead, toggleStar, archive, moveToTrash } = useEmailActions();

  const sender = thread.participants[0];
  const senderDisplay = formatSender(sender?.email || "Unknown", sender?.name);

  const handleSwipeLeft = () => {
    moveToTrash(thread._id);
  };

  const handleSwipeRight = () => {
    archive(thread._id);
  };

  const content = (
    <motion.div
      className={cn(
        "group relative flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-lg",
        "hover:bg-[var(--accent)]/50 transition-colors duration-150"
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Unread indicator */}
      <div className="w-2 shrink-0 flex justify-center">
        {!thread.isRead && (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
        )}
      </div>

      {/* Sender */}
      <span
        className={cn(
          "w-[180px] shrink-0 truncate text-sm",
          !thread.isRead ? "font-medium text-[var(--foreground)]" : "text-[var(--foreground)]"
        )}
      >
        {senderDisplay}
      </span>

      {/* Subject */}
      <span
        className={cn(
          "flex-1 truncate text-sm",
          !thread.isRead ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
        )}
      >
        {thread.subject || "(No Subject)"}
      </span>

      {/* Right side: Time + Icons or Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <AnimatePresence mode="wait">
          {isHovered && !isMobile ? (
            <motion.div
              key="actions"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
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
            <motion.div
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                {formatRelativeTime(thread.lastMessageAt)}
              </span>

              {/* Icons */}
              <div className="flex items-center gap-1">
                {thread.isStarred && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                )}
                {thread.hasAttachments && (
                  <Paperclip className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
    <button
      className={cn(
        "p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors",
        active && "text-yellow-500"
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className={cn("h-3.5 w-3.5", active && "fill-current")} />
    </button>
  );
}
