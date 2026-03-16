import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";

export function StarredScreen() {
  const navigate = useNavigate();

  const { threads } = useQuery(api.emails.queries.listThreads, {
    isStarred: true,
  }) ?? { threads: [] };

  return (
    <div className="flex flex-col h-full">
      <Header title="Starred" showBack />

      <EmailList
        threads={threads}
        onThreadClick={(threadId) => navigate(`/thread/${threadId}`)}
        emptyMessage="No starred emails"
      />
    </div>
  );
}
