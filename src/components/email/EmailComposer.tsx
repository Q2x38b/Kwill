import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Image, Smile, AtSign, Wand2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Message } from "@/types/email";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmailComposerProps {
  threadId?: Id<"threads">;
  replyTo?: Message;
  onSend?: () => void;
  onCancel?: () => void;
  standalone?: boolean;
}

export function EmailComposer({
  threadId,
  replyTo,
  onSend,
  onCancel: _onCancel,
  standalone = false,
}: EmailComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const saveDraft = useMutation(api.emails.mutations.saveDraft);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  }, [body]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!body.trim()) return;

    setIsSending(true);
    try {
      await saveDraft({
        to: replyTo ? [replyTo.from.email] : [],
        subject: replyTo ? `Re: ${replyTo.subject}` : "",
        body: body,
        replyToThreadId: threadId,
      });
      setBody("");
      onSend?.();
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("p-4", standalone && "max-w-3xl mx-auto")}>
      {/* Text input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your reply..."
          className={cn(
            "w-full resize-none bg-transparent text-[var(--foreground)]",
            "placeholder:text-[var(--muted-foreground)]",
            "focus:outline-none",
            "min-h-[100px] max-h-[300px]"
          )}
          rows={4}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
        {/* Left tools */}
        <div className="flex items-center gap-1">
          <ToolButton icon={Paperclip} label="Attach file" />
          <ToolButton icon={Image} label="Add image" />
          <ToolButton icon={Smile} label="Add emoji" />
          <ToolButton icon={AtSign} label="Mention" />
          <ToolButton icon={Wand2} label="AI assist" />
        </div>

        {/* Send button */}
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleSend}
            disabled={!body.trim() || isSending}
            size="sm"
            className="gap-2 rounded-lg"
          >
            Send
            <Send className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Paperclip;
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
      onClick={onClick}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </motion.button>
  );
}
