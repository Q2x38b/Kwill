import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, RedirectToSignIn } from "@clerk/react";
import { AppShell } from "@/components/layout/AppShell";
import { InboxScreen } from "@/screens/InboxScreen";
import { ThreadScreen } from "@/screens/ThreadScreen";
import { ComposeScreen } from "@/screens/ComposeScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { StarredScreen } from "@/screens/StarredScreen";
import { ArchiveScreen } from "@/screens/ArchiveScreen";
import { TrashScreen } from "@/screens/TrashScreen";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<InboxScreen />} />
          <Route path="thread/:threadId" element={<ThreadScreen />} />
          <Route path="compose" element={<ComposeScreen />} />
          <Route path="search" element={<SearchScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="starred" element={<StarredScreen />} />
          <Route path="archive" element={<ArchiveScreen />} />
          <Route path="trash" element={<TrashScreen />} />
          <Route path="sent" element={<InboxScreen />} />
          <Route path="drafts" element={<InboxScreen />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
