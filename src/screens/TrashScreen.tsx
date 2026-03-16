import { Header } from "@/components/layout/Header";
import { EmailList } from "@/components/email/EmailList";
import { useThreadModal } from "@/hooks/useThreadModal";

export function TrashScreen() {
  // Note: We'd need a separate query for trash
  // For now, this shows an empty state
  const threads: never[] = [];

  const { openThread, ThreadModalComponent } = useThreadModal(threads);

  return (
    <div className="flex flex-col h-full">
      <Header title="Trash" showBack />

      <EmailList
        threads={threads}
        onThreadClick={openThread}
        emptyMessage="Trash is empty"
      />

      <ThreadModalComponent />
    </div>
  );
}
