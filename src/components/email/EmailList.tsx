import { useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Loader2 } from "lucide-react";
import { EmailListItem } from "./EmailListItem";
import { Skeleton } from "@/components/ui/skeleton";
import type { Thread } from "@/types/email";
import type { Id } from "../../../convex/_generated/dataModel";

interface EmailListProps {
  threads: Thread[];
  onThreadClick: (threadId: Id<"threads">) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

interface GroupedThreads {
  label: string;
  threads: Thread[];
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const threadDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (threadDay.getTime() >= today.getTime()) {
    return "Today";
  } else if (threadDay.getTime() >= yesterday.getTime()) {
    return "Yesterday";
  } else {
    // Format as "February 27, 2026"
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
}

function groupThreadsByDate(threads: Thread[]): GroupedThreads[] {
  const groups = new Map<string, Thread[]>();

  threads.forEach((thread) => {
    const threadDate = new Date(thread.lastMessageAt);
    const label = formatDateLabel(threadDate);

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(thread);
  });

  return Array.from(groups.entries()).map(([label, threads]) => ({
    label,
    threads,
  }));
}

export function EmailList({
  threads,
  onThreadClick,
  emptyMessage = "No emails",
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: EmailListProps) {
  const groupedThreads = useMemo(() => groupThreadsByDate(threads), [threads]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll using Intersection Observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto px-4 py-2">
        {Array.from({ length: 10 }).map((_, i) => (
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
      <div className="max-w-3xl mx-auto px-2 py-2">
        <AnimatePresence initial={false}>
          {groupedThreads.map((group) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4"
            >
              {/* Date label */}
              <h2 className="text-xs font-medium text-[var(--muted-foreground)] px-3 py-2">
                {group.label}
              </h2>

              {/* Threads in group */}
              <div>
                {group.threads.map((thread, index) => (
                  <motion.div
                    key={thread._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      duration: 0.15,
                      delay: Math.min(index * 0.02, 0.1),
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

        {/* Load more trigger / loading indicator */}
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3">
      <Skeleton className="w-2 h-2 rounded-full" />
      <Skeleton className="h-4 w-[140px]" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}
