import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const getOrCreate = useMutation(api.users.getOrCreate);
  const autoSetup = useAction(api.sync.gmail.autoSetup);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isLoaded && user && !hasInitialized.current) {
      hasInitialized.current = true;

      // Ensure user exists in Convex when they sign in
      getOrCreate({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      })
        .then(() => {
          // Auto-setup Gmail if user signed in with Google
          // This runs in the background and doesn't block the UI
          autoSetup({}).catch((err) => {
            // Non-fatal - user can still manually set up in settings
            console.log("Auto-setup skipped or failed:", err);
          });
        })
        .catch((err) => {
          console.error("Failed to sync user to Convex:", err);
        });
    }
  }, [isLoaded, user, getOrCreate, autoSetup]);

  // Reset initialization flag when user changes
  useEffect(() => {
    if (!user) {
      hasInitialized.current = false;
    }
  }, [user]);

  return <>{children}</>;
}
