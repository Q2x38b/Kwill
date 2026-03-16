import * as React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
}

interface SwipeableItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  disabled?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 100;

export function SwipeableItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  disabled = false,
  className,
}: SwipeableItemProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = React.useState(false);

  // Background opacity based on swipe distance
  const leftOpacity = useTransform(
    x,
    [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, 0],
    [1, 0.8, 0]
  );
  const rightOpacity = useTransform(
    x,
    [0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5],
    [0, 0.8, 1]
  );

  // Icon scale based on swipe distance
  const leftIconScale = useTransform(
    x,
    [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, -50, 0],
    [1.2, 1, 0.8, 0.5]
  );
  const rightIconScale = useTransform(
    x,
    [0, 50, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5],
    [0.5, 0.8, 1, 1.2]
  );

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    setIsDragging(false);

    if (info.offset.x < -SWIPE_THRESHOLD && onSwipeLeft) {
      onSwipeLeft();
    } else if (info.offset.x > SWIPE_THRESHOLD && onSwipeRight) {
      onSwipeRight();
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left action background (swipe left reveals this on the right) */}
      {leftAction && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-6"
          style={{
            backgroundColor: leftAction.bgColor,
            opacity: leftOpacity,
            width: "50%",
          }}
        >
          <motion.div style={{ scale: leftIconScale }}>
            <leftAction.icon
              className="h-6 w-6"
              style={{ color: leftAction.color }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Right action background (swipe right reveals this on the left) */}
      {rightAction && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center justify-start pl-6"
          style={{
            backgroundColor: rightAction.bgColor,
            opacity: rightOpacity,
            width: "50%",
          }}
        >
          <motion.div style={{ scale: rightIconScale }}>
            <rightAction.icon
              className="h-6 w-6"
              style={{ color: rightAction.color }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative bg-[var(--background)] touch-pan-y",
          isDragging && "cursor-grabbing"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
