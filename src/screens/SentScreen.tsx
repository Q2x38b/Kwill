import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";
import { useThreadModal } from "@/hooks/useThreadModal";

export function SentScreen() {
  const result = useQuery(api.emails.queries.listSentThreads, {}) ?? {
    threads: [],
    hasMore: false,
  };

  const { openThread, ThreadModalComponent } = useThreadModal(result.threads);

  return (
    <div className="flex flex-col h-full">
      <Header title="Sent" showBack />

      <EmailList
        threads={result.threads}
        onThreadClick={openThread}
        emptyMessage="No sent emails"
        hasMore={result.hasMore}
      />

      <ThreadModalComponent />
    </div>
  );
}
