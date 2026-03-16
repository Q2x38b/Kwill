import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Paperclip, X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const composeSchema = z.object({
  to: z.string().min(1, "At least one recipient required"),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
});

type ComposeForm = z.infer<typeof composeSchema>;

export function AppShell() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [composeOpen, setComposeOpen] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const unreadCount = useQuery(api.emails.queries.getUnreadCount) ?? 0;
  const saveDraft = useMutation(api.emails.mutations.saveDraft);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ComposeForm>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
    },
  });

  const handleCompose = () => {
    if (isMobile) {
      navigate("/compose");
    } else {
      setComposeOpen(true);
    }
  };

  const onSubmit = async (data: ComposeForm) => {
    setIsSending(true);
    try {
      await saveDraft({
        to: data.to.split(",").map((e) => e.trim()),
        cc: data.cc ? data.cc.split(",").map((e) => e.trim()) : undefined,
        bcc: data.bcc ? data.bcc.split(",").map((e) => e.trim()) : undefined,
        subject: data.subject,
        body: data.body,
      });
      reset();
      setComposeOpen(false);
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseCompose = () => {
    reset();
    setShowCcBcc(false);
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
          <SheetContent side="right" size="lg" showHandle={false} className="p-0 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">New Message</h2>
              <Button variant="ghost" size="icon-sm" onClick={handleCloseCompose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
              {/* Recipients */}
              <div className="border-b border-[var(--border)]">
                <div className="flex items-center px-4 py-3 gap-2">
                  <span className="text-sm text-[var(--muted-foreground)] w-12">To:</span>
                  <Input
                    {...register("to")}
                    placeholder="Recipients"
                    className="border-0 focus-visible:ring-0 px-0 bg-transparent"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    className="shrink-0 text-[var(--muted-foreground)]"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showCcBcc && "rotate-180")} />
                  </Button>
                </div>
                {errors.to && (
                  <p className="px-4 pb-2 text-xs text-[var(--destructive)]">{errors.to.message}</p>
                )}

                {showCcBcc && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="flex items-center px-4 py-3 gap-2 border-t border-[var(--border)]">
                      <span className="text-sm text-[var(--muted-foreground)] w-12">Cc:</span>
                      <Input
                        {...register("cc")}
                        placeholder="Cc recipients"
                        className="border-0 focus-visible:ring-0 px-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center px-4 py-3 gap-2 border-t border-[var(--border)]">
                      <span className="text-sm text-[var(--muted-foreground)] w-12">Bcc:</span>
                      <Input
                        {...register("bcc")}
                        placeholder="Bcc recipients"
                        className="border-0 focus-visible:ring-0 px-0 bg-transparent"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Subject */}
              <div className="flex items-center px-4 py-3 gap-2 border-b border-[var(--border)]">
                <Input
                  {...register("subject")}
                  placeholder="Subject"
                  className="border-0 focus-visible:ring-0 px-0 text-base font-medium bg-transparent"
                />
              </div>
              {errors.subject && (
                <p className="px-4 py-1 text-xs text-[var(--destructive)]">{errors.subject.message}</p>
              )}

              {/* Body */}
              <div className="flex-1 p-4 overflow-auto">
                <Textarea
                  {...register("body")}
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
