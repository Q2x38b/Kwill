import { motion } from "framer-motion";
import { Star, Mail, MailOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@/types/email";

interface EmailFiltersProps {
  activeCategory?: EmailCategory;
  isStarred?: boolean;
  isUnread?: boolean;
  onCategoryChange: (category?: EmailCategory) => void;
  onFilterChange: (key: "isStarred" | "isUnread", value: boolean | undefined) => void;
}

const categories: { id: EmailCategory; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "social", label: "Social" },
  { id: "promotions", label: "Promotions" },
  { id: "updates", label: "Updates" },
];

export function EmailFilters({
  activeCategory,
  isStarred,
  isUnread,
  onCategoryChange,
  onFilterChange,
}: EmailFiltersProps) {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar border-b border-[var(--border)]">
      {/* Category filters */}
      {categories.map((category) => (
        <FilterChip
          key={category.id}
          label={category.label}
          isActive={activeCategory === category.id}
          onClick={() =>
            onCategoryChange(
              activeCategory === category.id ? undefined : category.id
            )
          }
        />
      ))}

      <div className="w-px bg-[var(--border)] mx-1 shrink-0" />

      {/* Quick filters */}
      <FilterChip
        icon={Star}
        label="Starred"
        isActive={isStarred === true}
        onClick={() =>
          onFilterChange("isStarred", isStarred === true ? undefined : true)
        }
      />
      <FilterChip
        icon={isUnread ? Mail : MailOpen}
        label="Unread"
        isActive={isUnread === true}
        onClick={() =>
          onFilterChange("isUnread", isUnread === true ? undefined : true)
        }
      />
    </div>
  );
}

function FilterChip({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon?: typeof Star;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
        isActive
          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--accent)]"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </motion.button>
  );
}
