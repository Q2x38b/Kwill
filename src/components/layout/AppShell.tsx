import { Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  const navigate = useNavigate();
  const unreadCount = useQuery(api.emails.queries.getUnreadCount) ?? 0;

  const handleCompose = () => {
    navigate("/compose");
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar */}
      <Sidebar unreadCount={unreadCount} onCompose={handleCompose} />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}
