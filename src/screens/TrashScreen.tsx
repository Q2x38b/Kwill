import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";

export function TrashScreen() {
  const navigate = useNavigate();

  // Note: We'd need a separate query for trash
  // For now, this shows an empty state
  const threads: never[] = [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Trash" showBack />

      <EmailList
        threads={threads}
        onThreadClick={(threadId) => navigate(`/thread/${threadId}`)}
        emptyMessage="Trash is empty"
      />
    </div>
  );
}
