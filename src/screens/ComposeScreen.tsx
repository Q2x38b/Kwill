import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Send, Paperclip, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const composeSchema = z.object({
  to: z.string().min(1, "At least one recipient required"),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message body is required"),
});

type ComposeForm = z.infer<typeof composeSchema>;

export function ComposeScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const saveDraft = useMutation(api.emails.mutations.saveDraft);

  // Get replyTo from URL params (for future reply functionality)
  const replyToThreadId = searchParams.get("replyTo");
  console.log("Reply to thread:", replyToThreadId); // Will be used for reply feature

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
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

  const onSubmit = async (data: ComposeForm) => {
    setIsSending(true);
    try {
      // For now, save as draft (Gmail send will be implemented with API)
      await saveDraft({
        to: data.to.split(",").map((e) => e.trim()),
        cc: data.cc ? data.cc.split(",").map((e) => e.trim()) : undefined,
        bcc: data.bcc ? data.bcc.split(",").map((e) => e.trim()) : undefined,
        subject: data.subject,
        body: data.body,
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
      // Save draft before closing
      const values = watch();
      saveDraft({
        to: values.to ? values.to.split(",").map((e) => e.trim()) : [],
        subject: values.subject || "(No Subject)",
        body: values.body || "",
      });
    }
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-full">
      <Header showBack title="New Message">
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </Header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Recipients */}
        <div className="border-b border-[var(--border)]">
          <div className="flex items-center px-4 py-3 gap-2">
            <span className="text-sm text-[var(--muted-foreground)] w-12">To:</span>
            <Input
              {...register("to")}
              placeholder="Recipients"
              className="border-0 focus-visible:ring-0 px-0"
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
              {errors.to.message}
            </p>
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
                  className="border-0 focus-visible:ring-0 px-0"
                />
              </div>
              <div className="flex items-center px-4 py-3 gap-2 border-t border-[var(--border)]">
                <span className="text-sm text-[var(--muted-foreground)] w-12">Bcc:</span>
                <Input
                  {...register("bcc")}
                  placeholder="Bcc recipients"
                  className="border-0 focus-visible:ring-0 px-0"
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
            className="border-0 focus-visible:ring-0 px-0 text-base font-medium"
          />
        </div>
        {errors.subject && (
          <p className="px-4 py-1 text-xs text-[var(--destructive)]">
            {errors.subject.message}
          </p>
        )}

        {/* Body */}
        <div className="flex-1 p-4 overflow-auto">
          <Textarea
            {...register("body")}
            placeholder="Write your message..."
            className="border-0 focus-visible:ring-0 min-h-full resize-none p-0"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--background)] safe-area-bottom">
          <Button type="button" variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
          </Button>

          <Button
            type="submit"
            disabled={isSending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
