import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";
import { useThreadModal } from "@/hooks/useThreadModal";

export function ArchiveScreen() {
  const { threads } = useQuery(api.emails.queries.listThreads, {
    isArchived: true,
  }) ?? { threads: [] };

  const { openThread, ThreadModalComponent } = useThreadModal(threads);

  return (
    <div className="flex flex-col h-full">
      <Header title="Archive" showBack />

      <EmailList
        threads={threads}
        onThreadClick={openThread}
        emptyMessage="No archived emails"
      />

      <ThreadModalComponent />
    </div>
  );
}
