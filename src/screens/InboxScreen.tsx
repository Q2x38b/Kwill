import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { motion } from "framer-motion";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";
import { EmailFilters } from "@/components/email/EmailFilters";
import { Button } from "@/components/ui/button";
import type { EmailCategory, EmailFilter, Thread } from "@/types/email";

export function InboxScreen() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EmailFilter>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [paginatedThreads, setPaginatedThreads] = useState<Thread[]>([]);
  const lastSyncRef = useRef<number>(0);
  // Force re-render every minute to update relative timestamps
  const [, setTick] = useState(0);

  // Query for first page - this updates in real-time from Convex
  const firstPageResult = useQuery(api.emails.queries.listThreads, {
    category: filters.category,
    isStarred: filters.isStarred,
    isUnread: filters.isUnread,
    cursor: undefined, // Always fetch first page for real-time updates
  });

  // Query for current paginated page (if any)
  const paginatedResult = useQuery(
    api.emails.queries.listThreads,
    cursor !== undefined
      ? {
          category: filters.category,
          isStarred: filters.isStarred,
          isUnread: filters.isUnread,
          cursor,
        }
      : "skip"
  );

  // Use smartSync which tries incremental first, falls back to full
  const smartSync = useAction(api.sync.gmail.smartSync);
  const fullSync = useAction(api.sync.gmail.fullSync);
  const loadMoreAction = useAction(api.sync.gmail.loadMoreEmails);
  const currentUser = useQuery(api.users.current);

  const firstPageThreads = firstPageResult?.threads ?? [];
  const hasMore = firstPageResult?.hasMore ?? false;
  const nextCursor = firstPageResult?.nextCursor;

  // Merge first page (real-time) with paginated threads
  const allThreads = useMemo(() => {
    if (paginatedThreads.length === 0) {
      return firstPageThreads;
    }
    // Merge: use first page threads + additional paginated threads
    const firstPageIds = new Set(firstPageThreads.map((t) => t._id));
    const additionalThreads = paginatedThreads.filter((t) => !firstPageIds.has(t._id));
    // Sort by lastMessageAt descending
    return [...firstPageThreads, ...additionalThreads].sort(
      (a, b) => b.lastMessageAt - a.lastMessageAt
    );
  }, [firstPageThreads, paginatedThreads]);

  const isLoading = firstPageResult === undefined && allThreads.length === 0;

  // When paginated query returns, accumulate those threads
  useEffect(() => {
    if (paginatedResult?.threads && paginatedResult.threads.length > 0) {
      setPaginatedThreads((prev) => {
        const existingIds = new Set(prev.map((t) => t._id));
        const newThreads = paginatedResult.threads.filter((t) => !existingIds.has(t._id));
        if (newThreads.length === 0) return prev;
        return [...prev, ...newThreads];
      });
    }
  }, [paginatedResult?.threads]);

  // Reset pagination when filters change
  useEffect(() => {
    setCursor(undefined);
    setPaginatedThreads([]);
  }, [filters.category, filters.isStarred, filters.isUnread]);

  // Timer to refresh relative timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCategoryChange = (category?: EmailCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const handleFilterChange = (key: keyof EmailFilter, value: boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Sync function that handles errors
  const doSync = useCallback(async (isBackground = false, forceSync = false) => {
    // Debounce - don't sync more than once per 30 seconds (unless forced)
    const now = Date.now();
    if (!forceSync && now - lastSyncRef.current < 30000) {
      return;
    }
    lastSyncRef.current = now;

    if (!isBackground) {
      setIsSyncing(true);
      setSyncError(null);
    }

    try {
      // Use smartSync for incremental updates, fullSync for initial sync
      const syncFn = currentUser?.gmailConnected ? smartSync : fullSync;
      const result = await syncFn({});
      console.log("Gmail sync result:", result);
    } catch (error) {
      console.error("Failed to sync Gmail:", error);
      if (!isBackground) {
        const errorMessage = error instanceof Error ? error.message : "Failed to sync Gmail";

        if (errorMessage.includes("CLERK_SECRET_KEY")) {
          setSyncError("Server configuration error. CLERK_SECRET_KEY not set.");
        } else if (errorMessage.includes("No Google OAuth token")) {
          setSyncError("No Gmail access. Please sign out and sign in again with Google.");
        } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
          setSyncError("Gmail access denied. Your Google token may have expired.");
        } else {
          setSyncError(errorMessage);
        }
      }
    } finally {
      if (!isBackground) {
        setIsSyncing(false);
      }
    }
  }, [currentUser?.gmailConnected, smartSync, fullSync]);

  // Auto-sync on app focus/visibility change and online status
  useEffect(() => {
    if (!currentUser?.gmailConnected) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        doSync(true); // Background sync on focus
      }
    };

    const handleFocus = () => {
      doSync(true); // Background sync on window focus
    };

    // Handle coming back online - force sync to catch up on missed emails
    const handleOnline = () => {
      console.log("Network online - syncing emails...");
      doSync(true, true); // Force sync, bypass debounce
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    // Initial sync when component mounts
    doSync(true);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [currentUser?.gmailConnected, doSync]);

  const handleSyncGmail = () => doSync(false);

  // Load more emails (both from database and potentially from Gmail)
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      // First, check if we need to fetch more from Gmail
      // If we're near the end of local data, trigger Gmail fetch
      if (allThreads.length > 0 && nextCursor) {
        // Try to load more from Gmail in background
        loadMoreAction({}).catch(console.error);
      }

      // Set cursor to load next page from database
      if (nextCursor) {
        setCursor(nextCursor);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, allThreads.length, nextCursor, loadMoreAction]);

  // Show empty state if no threads
  const showEmptyState = !isLoading && allThreads.length === 0;

  // Build inbox title with count
  const inboxTitle = allThreads.length > 0
    ? `Inbox (${allThreads.length}${hasMore ? "+" : ""})`
    : "Inbox";

  return (
    <div className="flex flex-col h-full">
      <Header
        title={inboxTitle}
        showSearch
        onSearchClick={() => navigate("/search")}
      />

      <EmailFilters
        activeCategory={filters.category}
        isStarred={filters.isStarred}
        isUnread={filters.isUnread}
        onCategoryChange={handleCategoryChange}
        onFilterChange={handleFilterChange}
      />

      {showEmptyState ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--secondary)] flex items-center justify-center">
              <Inbox className="h-8 w-8 text-[var(--muted-foreground)]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No emails yet</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              {currentUser?.gmailConnected
                ? "Sync your Gmail to see your emails."
                : "Sign in with Google to sync your Gmail inbox."}
            </p>
            {syncError && (
              <p className="text-sm text-[var(--destructive)] mb-4">{syncError}</p>
            )}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSyncGmail}
                disabled={isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync Gmail
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
              >
                Settings
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        <EmailList
          threads={allThreads}
          onThreadClick={(threadId) => navigate(`/thread/${threadId}`)}
          emptyMessage="Your inbox is empty"
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />
      )}
    </div>
  );
}
