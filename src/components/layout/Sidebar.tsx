import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Inbox,
  Star,
  Send,
  FileText,
  Archive,
  Trash2,
  Settings,
  PenSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: typeof Inbox;
  label: string;
  path: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { icon: Inbox, label: "Inbox", path: "/" },
  { icon: Star, label: "Starred", path: "/starred" },
  { icon: Send, label: "Sent", path: "/sent" },
  { icon: FileText, label: "Drafts", path: "/drafts" },
];

const secondaryNavItems: NavItem[] = [
  { icon: Archive, label: "Archive", path: "/archive" },
  { icon: Trash2, label: "Trash", path: "/trash" },
];

interface SidebarProps {
  unreadCount?: number;
  onCompose: () => void;
}

export function Sidebar({ unreadCount = 0, onCompose }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Kwil</h1>
      </div>

      {/* Compose button */}
      <div className="px-4 mb-4">
        <Button
          onClick={onCompose}
          className="w-full gap-2 shadow-md"
          size="lg"
        >
          <PenSquare className="h-5 w-5" />
          Compose
        </Button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            badge={item.path === "/" ? unreadCount : undefined}
          />
        ))}

        <div className="h-px bg-[var(--border)] my-4" />

        {secondaryNavItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-[var(--border)]">
        <NavItem item={{ icon: Settings, label: "Settings", path: "/settings" }} />
      </div>
    </aside>
  );
}

function NavItem({ item, badge }: { item: NavItem; badge?: number }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className="h-5 w-5" />
          <span className="flex-1">{item.label}</span>
          {badge !== undefined && badge > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center",
                isActive
                  ? "bg-[var(--primary-foreground)] text-[var(--primary)]"
                  : "bg-[var(--primary)] text-[var(--primary-foreground)]"
              )}
            >
              {badge > 99 ? "99+" : badge}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  );
}
