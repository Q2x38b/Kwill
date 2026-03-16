import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Inbox, Search, PenSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: typeof Inbox;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Inbox, label: "Inbox", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: PenSquare, label: "Compose", path: "/compose" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

interface BottomNavProps {
  unreadCount?: number;
}

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--border)] safe-area-bottom z-40">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 p-2 relative"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "relative p-2 rounded-xl transition-colors duration-200",
                  isActive && "bg-[var(--primary)]/10"
                )}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    isActive
                      ? "text-[var(--primary)]"
                      : "text-[var(--muted-foreground)]"
                  )}
                />

                {/* Unread badge for inbox */}
                {item.path === "/" && unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--destructive)] text-[var(--destructive-foreground)] text-[10px] font-bold flex items-center justify-center"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </motion.div>

              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
