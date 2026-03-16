import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Trash2,
  Star,
  Reply,
  Forward,
  MoreHorizontal,
  X,
  Sparkles,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Thread, Message } from "@/types/email";
import { EmailMessage } from "./EmailMessage";
import { EmailComposer } from "./EmailComposer";
import { Button } from "@/components/ui/button";
import { useEmailActions } from "@/hooks/useEmailActions";
import { cn } from "@/lib/utils";

interface EmailThreadProps {
  threadId: Id<"threads">;
  thread: Thread;
}

export function EmailThread({ threadId, thread }: EmailThreadProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showComposer, setShowComposer] = useState(false);
  // Force re-render every minute to update relative timestamps
  const [, setTick] = useState(0);

  const messages = (useQuery(api.emails.queries.getMessages, { threadId }) ?? []) as Message[];
  const { archive, moveToTrash, toggleStar, markAsRead } = useEmailActions();

  // Mark thread as read when viewed
  useEffect(() => {
    if (!thread.isRead) {
      markAsRead(threadId, true);
    }
  }, [threadId, thread.isRead, markAsRead]);

  const handleArchive = async () => {
    await archive(threadId);
    navigate("/");
  };

  const handleDelete = async () => {
    await moveToTrash(threadId);
    navigate("/");
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  // Timer to refresh relative timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const latestMessage = messages[messages.length - 1];

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
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

      {/* Bottom action bar - like reference image */}
      <div className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
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

            <div className="w-px h-5 bg-[var(--border)] mx-1" />

            <ActionButton
              icon={MoreHorizontal}
              label="More"
              onClick={() => {}}
            />
            <ActionButton
              icon={Sparkles}
              label="AI Actions"
              onClick={() => {}}
            />
          </div>

          {/* Reply button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
            className="fixed inset-x-0 bottom-0 bg-[var(--card)] border-t border-[var(--border)] shadow-lg rounded-t-2xl z-50 max-h-[70vh] overflow-hidden"
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
