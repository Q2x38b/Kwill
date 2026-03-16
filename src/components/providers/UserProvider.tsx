import { useEffect } from "react";
import { useUser } from "@clerk/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const getOrCreate = useMutation(api.users.getOrCreate);

  useEffect(() => {
    if (isLoaded && user) {
      // Ensure user exists in Convex when they sign in
      getOrCreate({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      }).catch((err) => {
        console.error("Failed to sync user to Convex:", err);
      });
    }
  }, [isLoaded, user, getOrCreate]);

  return <>{children}</>;
}
