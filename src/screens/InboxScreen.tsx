import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { useSession } from "@clerk/react";
import { motion } from "framer-motion";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";
import { EmailFilters } from "@/components/email/EmailFilters";
import { Button } from "@/components/ui/button";
import type { EmailCategory, EmailFilter } from "@/types/email";

export function InboxScreen() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [filters, setFilters] = useState<EmailFilter>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const result = useQuery(api.emails.queries.listThreads, {
    category: filters.category,
    isStarred: filters.isStarred,
    isUnread: filters.isUnread,
  });

  const syncGmail = useAction(api.sync.gmail.fullSync);
  const currentUser = useQuery(api.users.current);

  const threads = result?.threads ?? [];
  const isLoading = result === undefined;

  const handleCategoryChange = (category?: EmailCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const handleFilterChange = (key: keyof EmailFilter, value: boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSyncGmail = async () => {
    if (!session) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Get OAuth token from Clerk - requires "oauth_google" JWT template
      // that includes the Google OAuth access token
      const token = await session.getToken({ template: "oauth_google" });

      if (!token) {
        setSyncError(
          "Gmail OAuth token not available. Create an 'oauth_google' JWT template in Clerk Dashboard with the Google access token."
        );
        return;
      }

      const result = await syncGmail({ accessToken: token });
      console.log("Gmail sync result:", result);
    } catch (error) {
      console.error("Failed to sync Gmail:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sync Gmail";

      // Provide more helpful error messages
      if (errorMessage.includes("template") || errorMessage.includes("JWT")) {
        setSyncError(
          "JWT template 'oauth_google' not found. Please create it in Clerk Dashboard > JWT Templates."
        );
      } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
        setSyncError(
          "Gmail access denied. Ensure your Google account has Gmail API access enabled."
        );
      } else {
        setSyncError(errorMessage);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Show empty state if no threads
  const showEmptyState = !isLoading && threads.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Inbox"
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
          threads={threads}
          onThreadClick={(threadId) => navigate(`/thread/${threadId}`)}
          emptyMessage="Your inbox is empty"
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
