import { useState, useEffect } from "react";
import { useUser, useClerk, UserButton } from "@clerk/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { Moon, Sun, Monitor, LogOut, Trash2, Loader2, Bell, BellOff, RefreshCw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { GmailConnection } from "@/components/settings/GmailConnection";
import { cn } from "@/lib/utils";

export function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const currentUser = useQuery(api.users.current);
  const updateSettings = useMutation(api.users.updateSettings);
  const clearData = useMutation(api.dev.seed.clearSampleData);
  const setupWatch = useAction(api.sync.gmail.setupWatch);
  const getWatchStatus = useAction(api.sync.gmail.getWatchStatus);
  const [isClearing, setIsClearing] = useState(false);
  const [isSettingUpWatch, setIsSettingUpWatch] = useState(false);
  const [watchStatus, setWatchStatus] = useState<{
    hasWatch: boolean;
    expiration?: number;
    topicConfigured: boolean;
  } | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);

  // Fetch watch status on mount and when user changes
  useEffect(() => {
    if (currentUser?.gmailConnected) {
      getWatchStatus({})
        .then(setWatchStatus)
        .catch((err) => console.error("Failed to get watch status:", err));
    }
  }, [currentUser?.gmailConnected, getWatchStatus]);

  const handleSetupWatch = async () => {
    setIsSettingUpWatch(true);
    setWatchError(null);
    try {
      const result = await setupWatch({});
      if (result.success) {
        setWatchStatus({
          hasWatch: true,
          expiration: result.expiration,
          topicConfigured: true,
        });
      } else {
        setWatchError(result.error || "Failed to set up push notifications");
      }
    } catch (error) {
      setWatchError(error instanceof Error ? error.message : "Failed to set up push notifications");
    } finally {
      setIsSettingUpWatch(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm("This will delete all your email data. Are you sure?")) return;

    setIsClearing(true);
    try {
      await clearData({});
    } catch (error) {
      console.error("Failed to clear data:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleThemeChange = async (theme: "system" | "light" | "dark") => {
    if (!currentUser?.settings) return;

    await updateSettings({
      settings: {
        ...currentUser.settings,
        theme,
      },
    });

    // Apply theme to document
    document.documentElement.classList.remove("light", "dark");
    if (theme !== "system") {
      document.documentElement.classList.add(theme);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" showBack />

      <div className="flex-1 overflow-auto">
        {/* Profile section */}
        <section className="p-4">
          <div className="flex items-center gap-4 p-4 bg-[var(--card)] rounded-2xl">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-16 w-16",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </section>

        {/* Gmail connection */}
        <section className="p-4 pt-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 px-1">
            Email Account
          </h2>
          <GmailConnection />
        </section>

        {/* Real-time notifications */}
        {currentUser?.gmailConnected && (
          <section className="p-4 pt-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 px-1">
              Real-time Updates
            </h2>
            <div className="bg-[var(--card)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {watchStatus?.hasWatch ? (
                    <Bell className="h-5 w-5 text-[var(--success)]" />
                  ) : (
                    <BellOff className="h-5 w-5 text-[var(--muted-foreground)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {watchStatus?.hasWatch ? "Push notifications active" : "Push notifications inactive"}
                    </p>
                    {watchStatus?.hasWatch && watchStatus.expiration && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Expires: {new Date(watchStatus.expiration).toLocaleDateString()}
                      </p>
                    )}
                    {!watchStatus?.topicConfigured && (
                      <p className="text-xs text-[var(--destructive)]">
                        Server not configured for push notifications
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetupWatch}
                  disabled={isSettingUpWatch || !watchStatus?.topicConfigured}
                  className="gap-2"
                >
                  {isSettingUpWatch ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {watchStatus?.hasWatch ? "Renew" : "Enable"}
                </Button>
              </div>
              {watchError && (
                <p className="text-xs text-[var(--destructive)]">{watchError}</p>
              )}
              <p className="text-xs text-[var(--muted-foreground)]">
                Push notifications deliver new emails instantly without polling.
              </p>
            </div>
          </section>
        )}

        {/* Appearance */}
        <section className="p-4 pt-0">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-2 px-1">
            Appearance
          </h2>
          <div className="bg-[var(--card)] rounded-2xl p-4">
            <p className="text-sm mb-3">Theme</p>
            <div className="flex gap-2">
              <ThemeButton
                icon={Monitor}
                label="System"
                isActive={currentUser?.settings?.theme === "system"}
                onClick={() => handleThemeChange("system")}
              />
              <ThemeButton
                icon={Sun}
                label="Light"
                isActive={currentUser?.settings?.theme === "light"}
                onClick={() => handleThemeChange("light")}
              />
              <ThemeButton
                icon={Moon}
                label="Dark"
                isActive={currentUser?.settings?.theme === "dark"}
                onClick={() => handleThemeChange("dark")}
              />
            </div>
          </div>
        </section>

        {/* Data management */}
        <section className="p-4 pt-0">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-2 px-1">
            Data
          </h2>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleClearData}
            disabled={isClearing}
          >
            {isClearing ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--destructive)]" />
            ) : (
              <Trash2 className="h-5 w-5 text-[var(--destructive)]" />
            )}
            <span className="text-[var(--destructive)]">Clear All Email Data</span>
          </Button>
        </section>

        {/* Sign out */}
        <section className="p-4 pt-0">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5 text-[var(--destructive)]" />
            <span className="text-[var(--destructive)]">Sign Out</span>
          </Button>
        </section>
      </div>
    </div>
  );
}

function ThemeButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: typeof Sun;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
        isActive
          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "bg-[var(--accent)] hover:bg-[var(--accent)]/80"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
