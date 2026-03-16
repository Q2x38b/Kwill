import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Inbox, Loader2, Sparkles } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";
import { EmailFilters } from "@/components/email/EmailFilters";
import { Button } from "@/components/ui/button";
import type { EmailCategory, EmailFilter } from "@/types/email";

export function InboxScreen() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EmailFilter>({});
  const [isSeeding, setIsSeeding] = useState(false);

  const result = useQuery(api.emails.queries.listThreads, {
    category: filters.category,
    isStarred: filters.isStarred,
    isUnread: filters.isUnread,
  });

  const seedData = useMutation(api.dev.seed.seedSampleData);
  const currentUser = useQuery(api.users.current);

  const threads = result?.threads ?? [];
  const isLoading = result === undefined;

  const handleCategoryChange = (category?: EmailCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const handleFilterChange = (key: keyof EmailFilter, value: boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedData({});
    } catch (error) {
      console.error("Failed to seed data:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  // Show empty state with seed option if no threads and Gmail not connected
  const showEmptyState = !isLoading && threads.length === 0 && !currentUser?.gmailConnected;

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
              Connect your Gmail account in Settings, or load sample data to explore the app.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="gap-2"
              >
                {isSeeding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Load Sample Emails
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
              >
                Connect Gmail
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
