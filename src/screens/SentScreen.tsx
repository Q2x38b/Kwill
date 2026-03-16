import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";

export function SentScreen() {
  const navigate = useNavigate();

  const result = useQuery(api.emails.queries.listSentThreads, {}) ?? {
    threads: [],
    hasMore: false,
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Sent" showBack />

      <EmailList
        threads={result.threads}
        onThreadClick={(threadId) => navigate(`/thread/${threadId}`)}
        emptyMessage="No sent emails"
        hasMore={result.hasMore}
      />
    </div>
  );
}
