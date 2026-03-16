import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { X, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

interface Contact {
  _id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  googleResourceName?: string;
}

// Store contact details for display
interface ContactChip {
  email: string;
  name?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

interface ContactsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
}

// Generate a consistent gradient color for disco ball avatar
function getAvatarGradient(str: string): { bg: string; dots: string } {
  const gradients = [
    { bg: "from-pink-500 to-rose-500", dots: "bg-pink-300" },
    { bg: "from-purple-500 to-violet-500", dots: "bg-purple-300" },
    { bg: "from-blue-500 to-indigo-500", dots: "bg-blue-300" },
    { bg: "from-cyan-500 to-teal-500", dots: "bg-cyan-300" },
    { bg: "from-emerald-500 to-green-500", dots: "bg-emerald-300" },
    { bg: "from-yellow-500 to-orange-500", dots: "bg-yellow-300" },
    { bg: "from-rose-500 to-pink-500", dots: "bg-rose-300" },
    { bg: "from-indigo-500 to-purple-500", dots: "bg-indigo-300" },
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// Disco ball style avatar component
function DiscoBallAvatar({ email, size = "md" }: { email: string; size?: "sm" | "md" }) {
  const gradient = getAvatarGradient(email);
  const sizeClasses = size === "sm" ? "w-6 h-6" : "w-10 h-10";
  const dotSize = size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5";

  return (
    <div className={cn(
      sizeClasses,
      "rounded-full bg-gradient-to-br relative overflow-hidden shrink-0",
      gradient.bg
    )}>
      {/* Disco ball dot pattern */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-[2px] p-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              dotSize,
              "rounded-full opacity-60",
              gradient.dots
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ContactsInput({
  value,
  onChange,
  placeholder = "Recipients",
  className,
}: ContactsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [contactDetails, setContactDetails] = useState<Map<string, ContactChip>>(
    new Map()
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search contacts based on input
  const contacts = useQuery(
    api.emails.queries.searchContacts,
    inputValue.length > 0 ? { query: inputValue, limit: 5 } : "skip"
  );

  // Get suggestions (excluding already selected emails)
  const suggestions = (contacts ?? []).filter(
    (c) => !value.includes(c.email)
  );

  const showSuggestions = isFocused && suggestions.length > 0;

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length]);

  const addEmail = useCallback(
    (email: string, contact?: Contact) => {
      const trimmed = email.trim().toLowerCase();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
        // Store contact details for display
        if (contact) {
          setContactDetails((prev) => {
            const next = new Map(prev);
            next.set(trimmed, {
              email: trimmed,
              name: contact.name,
              avatarUrl: contact.avatarUrl,
              isVerified: !!contact.googleResourceName,
            });
            return next;
          });
        }
      }
      setInputValue("");
    },
    [value, onChange]
  );

  const removeEmail = useCallback(
    (email: string) => {
      onChange(value.filter((e) => e !== email));
      setContactDetails((prev) => {
        const next = new Map(prev);
        next.delete(email);
        return next;
      });
    },
    [value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      e.preventDefault();
      if (showSuggestions && suggestions[selectedIndex]) {
        addEmail(suggestions[selectedIndex].email, suggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        addEmail(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1]);
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp" && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Escape") {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If user pastes or types a comma, split and add emails
    if (val.includes(",")) {
      const parts = val.split(",");
      parts.forEach((part, i) => {
        if (i < parts.length - 1 && part.trim()) {
          addEmail(part);
        }
      });
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(val);
    }
  };

  const handleSuggestionClick = (contact: Contact) => {
    addEmail(contact.email, contact);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get display name for a contact chip
  const getChipDisplay = (email: string) => {
    const details = contactDetails.get(email);
    return details?.name || email;
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className="flex flex-wrap items-center gap-2 min-h-[40px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Email chips with avatars */}
        {value.map((email) => {
          const details = contactDetails.get(email);
          return (
            <motion.span
              key={email}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-[var(--secondary)] text-sm group"
            >
              {/* Avatar - disco ball style */}
              {details?.avatarUrl ? (
                <img
                  src={details.avatarUrl}
                  alt={getChipDisplay(email)}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <DiscoBallAvatar email={email} size="sm" />
              )}

              {/* Name/Email with verified badge */}
              <span className="truncate max-w-[120px] text-[var(--foreground)] flex items-center gap-1">
                {getChipDisplay(email)}
                {details?.isVerified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
              </span>

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(email);
                }}
                className="p-0.5 hover:bg-[var(--muted)] rounded-full transition-colors opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.span>
          );
        })}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
        />
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[var(--card)] rounded-2xl shadow-xl border border-gray-100 dark:border-[var(--border)] overflow-hidden z-50"
          >
            {/* Contact suggestions */}
            <div className="py-2">
              {suggestions.map((contact, index) => {
                const isVerified = !!contact.googleResourceName;
                const displayName = contact.name || contact.email.split("@")[0];

                return (
                  <button
                    key={contact._id}
                    type="button"
                    onClick={() => handleSuggestionClick(contact)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-gray-50 dark:bg-[var(--accent)]"
                        : "hover:bg-gray-50 dark:hover:bg-[var(--accent)]"
                    )}
                  >
                    {/* Avatar - disco ball style */}
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <DiscoBallAvatar email={contact.email} size="md" />
                    )}

                    {/* Name with verified badge */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[15px] font-medium text-gray-900 dark:text-[var(--foreground)] truncate">
                        {displayName}
                      </span>
                      {isVerified && (
                        <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
