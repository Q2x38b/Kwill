import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useEmailActions() {
  const markAsReadMutation = useMutation(api.emails.mutations.markAsRead);
  const toggleStarMutation = useMutation(api.emails.mutations.toggleStar);
  const archiveMutation = useMutation(api.emails.mutations.archive);
  const unarchiveMutation = useMutation(api.emails.mutations.unarchive);
  const moveToTrashMutation = useMutation(api.emails.mutations.moveToTrash);
  const restoreFromTrashMutation = useMutation(api.emails.mutations.restoreFromTrash);
  const permanentDeleteMutation = useMutation(api.emails.mutations.permanentDelete);

  const markAsRead = async (threadId: Id<"threads">, isRead: boolean) => {
    await markAsReadMutation({ threadId, isRead });
  };

  const toggleStar = async (threadId: Id<"threads">) => {
    await toggleStarMutation({ threadId });
  };

  const archive = async (threadId: Id<"threads">) => {
    await archiveMutation({ threadId });
  };

  const unarchive = async (threadId: Id<"threads">) => {
    await unarchiveMutation({ threadId });
  };

  const moveToTrash = async (threadId: Id<"threads">) => {
    await moveToTrashMutation({ threadId });
  };

  const restoreFromTrash = async (threadId: Id<"threads">) => {
    await restoreFromTrashMutation({ threadId });
  };

  const permanentDelete = async (threadId: Id<"threads">) => {
    await permanentDeleteMutation({ threadId });
  };

  return {
    markAsRead,
    toggleStar,
    archive,
    unarchive,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
  };
}
