import { Outlet } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { ComposeModalProvider, useComposeModal } from "@/hooks/useComposeModal";

function AppShellContent() {
  const unreadCount = useQuery(api.emails.queries.getUnreadCount) ?? 0;
  const { openCompose } = useComposeModal();

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar */}
      <Sidebar unreadCount={unreadCount} onCompose={openCompose} />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav unreadCount={unreadCount} onCompose={openCompose} />
    </div>
  );
}

export function AppShell() {
  return (
    <ComposeModalProvider>
      <AppShellContent />
    </ComposeModalProvider>
  );
}
