import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useEmailActions() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Use actions for Gmail sync
  const markAsReadAction = useAction(api.emails.actions.markAsRead);
  const toggleStarAction = useAction(api.emails.actions.toggleStar);
  const archiveAction = useAction(api.emails.actions.archiveThread);
  const unarchiveAction = useAction(api.emails.actions.unarchiveThread);
  const trashAction = useAction(api.emails.actions.trashThread);
  const untrashAction = useAction(api.emails.actions.untrashThread);

  // Keep permanent delete as mutation (no Gmail sync needed)
  const permanentDeleteMutation = useMutation(api.emails.mutations.permanentDelete);

  const markAsRead = useCallback(async (threadId: Id<"threads">, isRead: boolean) => {
    setIsLoading(`read-${threadId}`);
    try {
      await markAsReadAction({ threadId, isRead });
    } finally {
      setIsLoading(null);
    }
  }, [markAsReadAction]);

  const toggleStar = useCallback(async (threadId: Id<"threads">) => {
    setIsLoading(`star-${threadId}`);
    try {
      await toggleStarAction({ threadId });
    } finally {
      setIsLoading(null);
    }
  }, [toggleStarAction]);

  const archive = useCallback(async (threadId: Id<"threads">) => {
    setIsLoading(`archive-${threadId}`);
    try {
      await archiveAction({ threadId });
    } finally {
      setIsLoading(null);
    }
  }, [archiveAction]);

  const unarchive = useCallback(async (threadId: Id<"threads">) => {
    setIsLoading(`unarchive-${threadId}`);
    try {
      await unarchiveAction({ threadId });
    } finally {
      setIsLoading(null);
    }
  }, [unarchiveAction]);

  const moveToTrash = useCallback(async (threadId: Id<"threads">) => {
    setIsLoading(`trash-${threadId}`);
    try {
      await trashAction({ threadId });
    } finally {
      setIsLoading(null);
    }
  }, [trashAction]);

  const restoreFromTrash = useCallback(async (threadId: Id<"threads">) => {
    setIsLoading(`restore-${threadId}`);
    try {
      await untrashAction({ threadId });
    } finally {
      setIsLoading(null);
    }
  }, [untrashAction]);

  const permanentDelete = useCallback(async (threadId: Id<"threads">) => {
    setIsLoading(`delete-${threadId}`);
    try {
      await permanentDeleteMutation({ threadId });
    } finally {
      setIsLoading(null);
    }
  }, [permanentDeleteMutation]);

  return {
    markAsRead,
    toggleStar,
    archive,
    unarchive,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    isLoading,
  };
}
