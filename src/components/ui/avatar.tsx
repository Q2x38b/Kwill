import * as React from "react";
import { cn, getInitials, generateAvatarColor } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  email?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, email = "", size = "md", ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const showFallback = !src || imageError;
    const initials = getInitials(name, email);
    const backgroundColor = generateAvatarColor(email);

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full items-center justify-center font-medium",
          sizeClasses[size],
          className
        )}
        style={showFallback ? { backgroundColor } : undefined}
        {...props}
      >
        {showFallback ? (
          <span className="text-white">{initials}</span>
        ) : (
          <img
            src={src}
            alt={alt || name || email}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
