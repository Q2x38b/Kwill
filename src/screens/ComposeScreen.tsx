import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { X, Send, Paperclip, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContactsInput } from "@/components/email/ContactsInput";
import { cn } from "@/lib/utils";

export function ComposeScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Recipient state
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);

  // Form state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<{
    to?: string;
    subject?: string;
    body?: string;
  }>({});

  const saveDraft = useMutation(api.emails.mutations.saveDraft);

  // Get replyTo from URL params (for future reply functionality)
  const replyToThreadId = searchParams.get("replyTo");
  console.log("Reply to thread:", replyToThreadId);

  const isDirty = to.length > 0 || subject || body;

  const validate = () => {
    const newErrors: typeof errors = {};
    if (to.length === 0) {
      newErrors.to = "At least one recipient required";
    }
    if (!subject.trim()) {
      newErrors.subject = "Subject is required";
    }
    if (!body.trim()) {
      newErrors.body = "Message body is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSending(true);
    try {
      await saveDraft({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        body,
      });
      navigate(-1);
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      saveDraft({
        to: to.length > 0 ? to : [],
        subject: subject || "(No Subject)",
        body: body || "",
      });
    }
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-full">
      <Header showBack title="New Message">
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon-sm" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </Header>

      <form
        onSubmit={onSubmit}
        className="flex-1 flex flex-col overflow-hidden bg-[var(--card)]"
      >
        {/* Recipients */}
        <div className="border-b border-[var(--border)]">
          <div className="flex items-center px-4 py-3 gap-2">
            <span className="text-sm text-[var(--muted-foreground)] w-12 shrink-0">
              To:
            </span>
            <ContactsInput
              value={to}
              onChange={setTo}
              placeholder="Recipients"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="shrink-0 text-[var(--muted-foreground)]"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showCcBcc && "rotate-180"
                )}
              />
            </Button>
          </div>
          {errors.to && (
            <p className="px-4 pb-2 text-xs text-[var(--destructive)]">
              {errors.to}
            </p>
          )}

          {showCcBcc && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="flex items-center px-4 py-3 gap-2 border-t border-[var(--border)]">
                <span className="text-sm text-[var(--muted-foreground)] w-12 shrink-0">
                  Cc:
                </span>
                <ContactsInput
                  value={cc}
                  onChange={setCc}
                  placeholder="Cc recipients"
                  className="flex-1"
                />
              </div>
              <div className="flex items-center px-4 py-3 gap-2 border-t border-[var(--border)]">
                <span className="text-sm text-[var(--muted-foreground)] w-12 shrink-0">
                  Bcc:
                </span>
                <ContactsInput
                  value={bcc}
                  onChange={setBcc}
                  placeholder="Bcc recipients"
                  className="flex-1"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Subject */}
        <div className="flex items-center px-4 py-3 gap-2 border-b border-[var(--border)]">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="border-0 focus-visible:ring-0 px-0 text-base font-medium text-[var(--foreground)] bg-transparent"
          />
        </div>
        {errors.subject && (
          <p className="px-4 py-1 text-xs text-[var(--destructive)]">
            {errors.subject}
          </p>
        )}

        {/* Body */}
        <div className="flex-1 p-4 overflow-auto">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="border-0 focus-visible:ring-0 min-h-full resize-none p-0 text-[var(--foreground)] bg-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--background)] safe-area-bottom">
          <Button type="button" variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
          </Button>

          <Button type="submit" disabled={isSending} className="gap-2">
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
