import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useAction } from "convex/react";
import {
  X,
  Send,
  Paperclip,
  Trash2,
  FileEdit,
  Sparkles,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContactsInput } from "@/components/email/ContactsInput";

export function ComposeScreen() {
  const navigate = useNavigate();
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
  const sendEmail = useAction(api.emails.actions.sendEmail);

  // Error state for send failures
  const [sendError, setSendError] = useState<string | null>(null);

  const isDirty = to.length > 0 || subject || body;

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDirty]);

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

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;

    setIsSending(true);
    setSendError(null);
    try {
      const result = await sendEmail({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        body,
      });

      if (result.success) {
        navigate(-1);
      } else {
        setSendError(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Failed to send:", error);
      setSendError(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!isDirty) {
      navigate(-1);
      return;
    }
    try {
      await saveDraft({
        to: to.length > 0 ? to : [],
        subject: subject || "(No Subject)",
        body: body || "",
      });
      navigate(-1);
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  const handleDiscard = () => {
    // Just close without saving
    navigate(-1);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Container - positioned to allow toolbar below */}
      <div className="relative flex flex-col items-center gap-4 w-full max-w-2xl mx-4">
        {/* Main Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
          className="w-full bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-[var(--primary)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                New Message
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={onSubmit}>
            {/* Recipients */}
            <div className="border-b border-[var(--border)]">
              <div className="flex items-start px-6 py-3 gap-3">
                <span className="text-sm text-[var(--muted-foreground)] pt-2 w-10 shrink-0">
                  To
                </span>
                <div className="flex-1 min-w-0">
                  <ContactsInput
                    value={to}
                    onChange={setTo}
                    placeholder="Recipients"
                    className="flex-1"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="shrink-0 text-[var(--muted-foreground)] text-xs"
                >
                  Cc / Bcc
                </Button>
              </div>
              {errors.to && (
                <p className="px-6 pb-2 text-xs text-[var(--destructive)]">
                  {errors.to}
                </p>
              )}

              <AnimatePresence>
                {showCcBcc && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start px-6 py-3 gap-3 border-t border-[var(--border)]">
                      <span className="text-sm text-[var(--muted-foreground)] pt-2 w-10 shrink-0">
                        Cc
                      </span>
                      <ContactsInput
                        value={cc}
                        onChange={setCc}
                        placeholder="Cc recipients"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-start px-6 py-3 gap-3 border-t border-[var(--border)]">
                      <span className="text-sm text-[var(--muted-foreground)] pt-2 w-10 shrink-0">
                        Bcc
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
              </AnimatePresence>
            </div>

            {/* Subject */}
            <div className="flex items-center px-6 py-3 gap-3 border-b border-[var(--border)]">
              <span className="text-sm text-[var(--muted-foreground)] w-10 shrink-0">
                Subject
              </span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="border-0 focus-visible:ring-0 px-0 text-base font-medium text-[var(--foreground)] bg-transparent h-auto py-0"
              />
            </div>
            {errors.subject && (
              <p className="px-6 py-1 text-xs text-[var(--destructive)]">
                {errors.subject}
              </p>
            )}

            {/* Body */}
            <div className="px-6 py-4 min-h-[240px] max-h-[400px] overflow-auto">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="border-0 focus-visible:ring-0 min-h-[200px] resize-none p-0 text-[var(--foreground)] bg-transparent text-base leading-relaxed"
              />
            </div>
            {errors.body && (
              <p className="px-6 pb-2 text-xs text-[var(--destructive)]">
                {errors.body}
              </p>
            )}

            {/* Send error display */}
            {sendError && (
              <div className="mx-6 mb-4 p-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20">
                <p className="text-sm text-[var(--destructive)]">
                  {sendError}
                </p>
              </div>
            )}

            {/* Attachments Preview Area */}
            <div className="px-6 pb-4">
              <div className="flex flex-wrap gap-2">
                {/* Attachment chips would go here */}
              </div>
            </div>
          </form>
        </motion.div>

        {/* Floating Action Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: 0.1 }}
          className="flex items-center gap-2 bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Discard */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDiscard}
            className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          <div className="w-px h-6 bg-[var(--border)]" />

          {/* Attachment */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-[var(--muted-foreground)]"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Save as Draft */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleSaveDraft}
            className="text-[var(--muted-foreground)] gap-2"
          >
            <FileEdit className="h-4 w-4" />
            <span className="text-sm">Save as draft</span>
          </Button>

          {/* AI Rewrite */}
          <Button
            type="button"
            variant="ghost"
            className="text-[var(--muted-foreground)] gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Rewrite</span>
          </Button>

          <div className="w-px h-6 bg-[var(--border)]" />

          {/* Send Button */}
          <Button
            type="button"
            onClick={() => onSubmit()}
            disabled={isSending}
            className="gap-2 px-5"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
