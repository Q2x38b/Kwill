import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";

export function ArchiveScreen() {
  const navigate = useNavigate();

  const { threads } = useQuery(api.emails.queries.listThreads, {
    isArchived: true,
  }) ?? { threads: [] };

  return (
    <div className="flex flex-col h-full">
      <Header title="Archive" showBack />

      <EmailList
        threads={threads}
        onThreadClick={(threadId) => navigate(`/thread/${threadId}`)}
        emptyMessage="No archived emails"
      />
    </div>
  );
}
