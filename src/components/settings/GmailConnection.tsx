import { useState } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Mail, Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Gmail OAuth scopes (for reference - configured in Clerk dashboard)
// - gmail.readonly: Read emails
// - gmail.send: Send emails
// - gmail.modify: Modify labels and status
// - gmail.compose: Create drafts
// - contacts.readonly: Access contacts

export function GmailConnection() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = useQuery(api.users.current);
  const setGmailConnected = useMutation(api.users.setGmailConnected);

  const isConnected = currentUser?.gmailConnected ?? false;

  const handleConnect = async () => {
    if (!user) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get OAuth token from Clerk for Google provider
      const externalAccounts = user.externalAccounts;
      const googleAccount = externalAccounts.find(
        (account) => account.provider === "google"
      );

      if (!googleAccount) {
        // Need to link Google account first
        // This would redirect to Google OAuth via Clerk
        setError("Please sign in with Google to connect Gmail");
        setIsConnecting(false);
        return;
      }

      // Get the OAuth access token from the connected account
      // Note: In production, you'd use Clerk's getToken with specific template
      // that includes Gmail scopes, configured in Clerk dashboard
      const token = await getToken({ template: "convex" });

      if (token) {
        // Store connection status in Convex
        await setGmailConnected({ connected: true });
      }
    } catch (err) {
      console.error("Failed to connect Gmail:", err);
      setError("Failed to connect Gmail. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      await setGmailConnected({ connected: false });
    } catch (err) {
      console.error("Failed to disconnect Gmail:", err);
      setError("Failed to disconnect. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="email-card p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            isConnected ? "bg-green-100 text-green-600" : "bg-[var(--secondary)]"
          )}
        >
          <Mail className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--foreground)] mb-1">
            Gmail Connection
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {isConnected
              ? "Your Gmail account is connected. Kwil can sync your emails."
              : "Connect your Gmail account to sync and manage your emails."}
          </p>

          {/* Status indicator */}
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-green-600 mb-4">
              <Check className="h-4 w-4" />
              <span>Connected as {currentUser?.email}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-[var(--destructive)] mb-4"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isConnecting}
                  className="gap-2"
                >
                  Disconnect
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="gap-2"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Connect Gmail
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Permissions info */}
      {!isConnected && (
        <div className="mt-6 pt-4 border-t border-[var(--border)]">
          <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">
            Required permissions
          </h4>
          <ul className="space-y-2">
            {[
              "Read your emails",
              "Send emails on your behalf",
              "Modify email labels and status",
              "Access your contacts",
            ].map((permission) => (
              <li
                key={permission}
                className="text-sm text-[var(--muted-foreground)] flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)]" />
                {permission}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
