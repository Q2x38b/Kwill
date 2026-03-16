import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox } from "lucide-react";
import { EmailListItem } from "./EmailListItem";
import { Skeleton } from "@/components/ui/skeleton";
import type { Thread } from "@/types/email";
import type { Id } from "../../../convex/_generated/dataModel";

interface EmailListProps {
  threads: Thread[];
  onThreadClick: (threadId: Id<"threads">) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

interface GroupedThreads {
  label: string;
  threads: Thread[];
}

function groupThreadsByDate(threads: Thread[]): GroupedThreads[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { [key: string]: Thread[] } = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  threads.forEach((thread) => {
    const threadDate = new Date(thread.lastMessageAt);
    const threadDay = new Date(
      threadDate.getFullYear(),
      threadDate.getMonth(),
      threadDate.getDate()
    );

    if (threadDay.getTime() >= today.getTime()) {
      groups.Today.push(thread);
    } else if (threadDay.getTime() >= yesterday.getTime()) {
      groups.Yesterday.push(thread);
    } else if (threadDay.getTime() >= lastWeek.getTime()) {
      groups["This Week"].push(thread);
    } else {
      groups.Earlier.push(thread);
    }
  });

  return Object.entries(groups)
    .filter(([, threads]) => threads.length > 0)
    .map(([label, threads]) => ({ label, threads }));
}

export function EmailList({
  threads,
  onThreadClick,
  emptyMessage = "No emails",
  isLoading,
}: EmailListProps) {
  const groupedThreads = useMemo(() => groupThreadsByDate(threads), [threads]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <EmailListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
        <div className="text-center">
          <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <AnimatePresence initial={false}>
          {groupedThreads.map((group) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Date label */}
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-1">
                {group.label}
              </h2>

              {/* Threads in group */}
              <div className="space-y-3">
                {group.threads.map((thread, index) => (
                  <motion.div
                    key={thread._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{
                      duration: 0.16,
                      ease: [0.22, 1, 0.36, 1],
                      delay: index * 0.03,
                    }}
                  >
                    <EmailListItem
                      thread={thread}
                      onClick={() => onThreadClick(thread._id)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmailListItemSkeleton() {
  return (
    <div className="email-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
