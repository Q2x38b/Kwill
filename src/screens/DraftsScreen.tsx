import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { FileEdit, Trash2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import type { Id } from "../../convex/_generated/dataModel";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function DraftsScreen() {
  const navigate = useNavigate();
  const drafts = useQuery(api.emails.queries.listDrafts, {}) ?? [];
  const deleteDraft = useMutation(api.emails.mutations.deleteDraft);

  const handleDeleteDraft = async (
    e: React.MouseEvent,
    draftId: Id<"drafts">
  ) => {
    e.stopPropagation();
    try {
      await deleteDraft({ draftId });
    } catch (error) {
      console.error("Failed to delete draft:", error);
    }
  };

  const handleDraftClick = (draftId: Id<"drafts">) => {
    navigate(`/compose?draft=${draftId}`);
  };

  const showEmptyState = drafts.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Header title="Drafts" showBack />

      {showEmptyState ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--secondary)] flex items-center justify-center">
              <FileEdit className="h-8 w-8 text-[var(--muted-foreground)]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No drafts</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Drafts you save will appear here.
            </p>
            <Button onClick={() => navigate("/compose")}>Compose</Button>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {drafts.map((draft) => (
            <motion.div
              key={draft._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--secondary)] cursor-pointer transition-colors"
              onClick={() => handleDraftClick(draft._id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {draft.to.length > 0
                      ? draft.to.join(", ")
                      : "No recipients"}
                  </p>
                  <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                    {formatRelativeTime(draft.updatedAt)}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground)] truncate">
                  {draft.subject || "(No subject)"}
                </p>
                <p className="text-sm text-[var(--muted-foreground)] truncate mt-0.5">
                  {draft.body || "(No content)"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                onClick={(e) => handleDeleteDraft(e, draft._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
