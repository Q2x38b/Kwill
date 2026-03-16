import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmailList } from "@/components/email/EmailList";
import { useDebounce } from "@/hooks/useDebounce";
import { useThreadModal } from "@/hooks/useThreadModal";

export function SearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const threads = useQuery(
    api.emails.queries.searchThreads,
    debouncedQuery.trim() ? { query: debouncedQuery } : "skip"
  );

  const { openThread, ThreadModalComponent } = useThreadModal(threads ?? []);

  return (
    <div className="flex flex-col h-full">
      {/* Search header */}
      <div className="sticky top-0 z-30 bg-[var(--background)] border-b border-[var(--border)] safe-area-top">
        <div className="flex items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(-1)}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emails..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {!debouncedQuery.trim() ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]"
          >
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Search your emails</p>
            </div>
          </motion.div>
        ) : threads === undefined ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="animate-pulse text-[var(--muted-foreground)]">
              Searching...
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <EmailList
              threads={threads}
              onThreadClick={openThread}
              emptyMessage="No results found"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ThreadModalComponent />
    </div>
  );
}
