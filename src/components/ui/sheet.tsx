import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface SheetContentProps {
  children?: React.ReactNode;
  className?: string;
  side?: "bottom" | "right";
  size?: "sm" | "md" | "lg" | "full";
  showHandle?: boolean;
  onClose?: () => void;
}

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("SheetTrigger must be used within Sheet");

  return (
    <button onClick={() => context.onOpenChange(true)} {...props}>
      {children}
    </button>
  );
}

const sizeClasses = {
  sm: "max-h-[40vh]",
  md: "max-h-[60vh]",
  lg: "max-h-[80vh]",
  full: "h-[95vh]",
};

function SheetContent({
  children,
  className,
  side = "bottom",
  size = "md",
  showHandle = true,
  onClose,
}: SheetContentProps) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("SheetContent must be used within Sheet");

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      context.onOpenChange(false);
    }
  };

  const handleClose = () => {
    onClose?.();
    context.onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {context.open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={
              side === "bottom"
                ? { y: "100%" }
                : { x: "100%" }
            }
            animate={
              side === "bottom"
                ? { y: 0 }
                : { x: 0 }
            }
            exit={
              side === "bottom"
                ? { y: "100%" }
                : { x: "100%" }
            }
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag={side === "bottom" ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed z-50 bg-[var(--background)] shadow-lg",
              side === "bottom" && [
                "inset-x-0 bottom-0 rounded-t-3xl",
                sizeClasses[size],
              ],
              side === "right" && "inset-y-0 right-0 w-full max-w-md",
              className
            )}
          >
            {/* Drag handle */}
            {showHandle && side === "bottom" && (
              <div className="flex justify-center py-3">
                <div className="h-1.5 w-12 rounded-full bg-[var(--muted-foreground)]/30" />
              </div>
            )}

            {/* Close button for side sheets */}
            {side === "right" && (
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-lg p-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <div className="overflow-auto h-full">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-4 pb-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[var(--muted-foreground)]", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
