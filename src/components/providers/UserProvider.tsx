import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const getOrCreate = useMutation(api.users.getOrCreate);
  const setGmailConnected = useMutation(api.users.setGmailConnected);
  const seedSampleData = useMutation(api.dev.seed.seedSampleData);
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
        .then(async () => {
          // Check if user signed in with Google
          const googleAccount = user.externalAccounts.find(
            (account) => account.provider === "google"
          );

          if (googleAccount) {
            // Auto-connect Gmail for Google sign-in users
            try {
              await setGmailConnected({ connected: true });
              // Seed sample data for demo purposes
              await seedSampleData({});
            } catch (err) {
              // Ignore errors - might already be seeded
              console.log("Auto-setup complete");
            }
          }
        })
        .catch((err) => {
          console.error("Failed to sync user to Convex:", err);
        });
    }
  }, [isLoaded, user, getOrCreate, setGmailConnected, seedSampleData]);

  // Reset initialization flag when user changes
  useEffect(() => {
    if (!user) {
      hasInitialized.current = false;
    }
  }, [user]);

  return <>{children}</>;
}
