import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";
import { useThreadModal } from "@/hooks/useThreadModal";

export function StarredScreen() {
  const { threads } = useQuery(api.emails.queries.listThreads, {
    isStarred: true,
  }) ?? { threads: [] };

  const { openThread, ThreadModalComponent } = useThreadModal(threads);

  return (
    <div className="flex flex-col h-full">
      <Header title="Starred" showBack />

      <EmailList
        threads={threads}
        onThreadClick={openThread}
        emptyMessage="No starred emails"
      />

      <ThreadModalComponent />
    </div>
  );
}
