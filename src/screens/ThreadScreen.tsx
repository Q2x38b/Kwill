import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Header } from "@/components/layout/Header";
import { EmailThread } from "@/components/email/EmailThread";
import { FullPageLoader } from "@/components/common/LoadingSpinner";

export function ThreadScreen() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();

  const thread = useQuery(
    api.emails.queries.getThread,
    threadId ? { threadId: threadId as Id<"threads"> } : "skip"
  );

  if (!threadId) {
    navigate("/");
    return null;
  }

  if (thread === undefined) {
    return <FullPageLoader />;
  }

  if (thread === null) {
    navigate("/");
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <Header showBack showMenu title={thread.subject} />
      <EmailThread threadId={threadId as Id<"threads">} thread={thread} />
    </div>
  );
}
