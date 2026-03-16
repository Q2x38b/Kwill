import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showMenu?: boolean;
  onSearchClick?: () => void;
  onMenuClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  showBack = false,
  showSearch = false,
  showMenu = false,
  onSearchClick,
  onMenuClick,
  children,
  className,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)] safe-area-top",
        className
      )}
    >
      {showBack && (
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      {title && (
        <h1 className="flex-1 text-lg font-semibold truncate">{title}</h1>
      )}

      {children && <div className="flex-1">{children}</div>}

      <div className="flex items-center gap-1">
        {showSearch && (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSearchClick}
            >
              <Search className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {showMenu && (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onMenuClick}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </div>
    </header>
  );
}
