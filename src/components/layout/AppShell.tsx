import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { Send, Paperclip, X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContactsInput } from "@/components/email/ContactsInput";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export function AppShell() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [composeOpen, setComposeOpen] = useState(false);
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

  const unreadCount = useQuery(api.emails.queries.getUnreadCount) ?? 0;
  const saveDraft = useMutation(api.emails.mutations.saveDraft);

  const handleCompose = () => {
    if (isMobile) {
      navigate("/compose");
    } else {
      setComposeOpen(true);
    }
  };

  const resetForm = () => {
    setTo([]);
    setCc([]);
    setBcc([]);
    setSubject("");
    setBody("");
    setErrors({});
    setShowCcBcc(false);
  };

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
      resetForm();
      setComposeOpen(false);
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseCompose = () => {
    resetForm();
    setComposeOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar */}
      <Sidebar unreadCount={unreadCount} onCompose={handleCompose} />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav unreadCount={unreadCount} />

      {/* Desktop compose modal */}
      {!isMobile && (
        <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
          <SheetContent
            side="right"
            size="lg"
            showHandle={false}
            className="p-0 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">New Message</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCloseCompose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Form */}
            <form
              onSubmit={onSubmit}
              className="flex-1 flex flex-col overflow-hidden"
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
                  className="border-0 focus-visible:ring-0 px-0 text-base font-medium bg-transparent"
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
                  className="border-0 focus-visible:ring-0 min-h-full resize-none p-0 bg-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                <Button type="button" variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>

                <Button type="submit" disabled={isSending} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
