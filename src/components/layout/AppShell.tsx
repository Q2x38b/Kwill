import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useMediaQuery";

export function AppShell() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [composeOpen, setComposeOpen] = useState(false);

  const unreadCount = useQuery(api.emails.queries.getUnreadCount) ?? 0;

  const handleCompose = () => {
    if (isMobile) {
      navigate("/compose");
    } else {
      setComposeOpen(true);
    }
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

      {/* Desktop compose modal */}
      {!isMobile && (
        <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
          <SheetContent side="right" size="lg" showHandle={false}>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4">New Message</h2>
              {/* ComposeScreen content will go here */}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
