import { useState } from "react";
import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Thread } from "@/types/email";
import { ThreadModal } from "@/components/email/ThreadModal";

export function useThreadModal(threads: Thread[]) {
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"threads"> | null>(null);

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId as Id<"threads">);
  };

  const closeThread = () => {
    setSelectedThreadId(null);
  };

  const ThreadModalComponent = () => (
    <AnimatePresence>
      {selectedThreadId && (
        <ThreadModalWrapper
          threadId={selectedThreadId}
          threads={threads}
          onClose={closeThread}
          onNavigate={(id) => setSelectedThreadId(id)}
        />
      )}
    </AnimatePresence>
  );

  return {
    selectedThreadId,
    openThread,
    closeThread,
    ThreadModalComponent,
  };
}

function ThreadModalWrapper({
  threadId,
  threads,
  onClose,
  onNavigate,
}: {
  threadId: Id<"threads">;
  threads: Thread[];
  onClose: () => void;
  onNavigate: (id: Id<"threads">) => void;
}) {
  const thread = useQuery(api.emails.queries.getThread, { threadId });

  // Find current index for navigation
  const currentIndex = threads.findIndex((t) => t._id === threadId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < threads.length - 1;

  const handleNavigatePrev = () => {
    if (hasPrev) {
      onNavigate(threads[currentIndex - 1]._id as Id<"threads">);
    }
  };

  const handleNavigateNext = () => {
    if (hasNext) {
      onNavigate(threads[currentIndex + 1]._id as Id<"threads">);
    }
  };

  if (!thread) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-[var(--card)] rounded-2xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
        </div>
      </div>
    );
  }

  return (
    <ThreadModal
      threadId={threadId}
      thread={thread}
      onClose={onClose}
      onNavigatePrev={handleNavigatePrev}
      onNavigateNext={handleNavigateNext}
      hasPrev={hasPrev}
      hasNext={hasNext}
    />
  );
}
