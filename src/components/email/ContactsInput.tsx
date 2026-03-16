import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

interface Contact {
  _id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

// Store contact details for display
interface ContactChip {
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface ContactsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
}

// Generate a consistent color from a string
function getAvatarColor(str: string): string {
  const colors = [
    "bg-rose-500",
    "bg-pink-500",
    "bg-fuchsia-500",
    "bg-purple-500",
    "bg-violet-500",
    "bg-indigo-500",
    "bg-blue-500",
    "bg-sky-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-green-500",
    "bg-lime-500",
    "bg-yellow-500",
    "bg-amber-500",
    "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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

  // Get initials for avatar
  const getInitials = (email: string) => {
    const details = contactDetails.get(email);
    if (details?.name) {
      const parts = details.name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return details.name[0].toUpperCase();
    }
    return email[0].toUpperCase();
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
              {/* Avatar */}
              {details?.avatarUrl ? (
                <img
                  src={details.avatarUrl}
                  alt={getChipDisplay(email)}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white",
                    getAvatarColor(email)
                  )}
                >
                  {getInitials(email)}
                </div>
              )}

              {/* Name/Email */}
              <span className="truncate max-w-[120px] text-[var(--foreground)]">
                {getChipDisplay(email)}
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
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[var(--popover)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50"
          >
            {/* Search header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] text-[var(--muted-foreground)]">
              <Search className="w-4 h-4" />
              <span className="text-sm">Search in contacts...</span>
            </div>

            {/* Contact suggestions */}
            {suggestions.map((contact, index) => (
              <button
                key={contact._id}
                type="button"
                onClick={() => handleSuggestionClick(contact)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-[var(--accent)]"
                    : "hover:bg-[var(--accent)]"
                )}
              >
                {/* Avatar */}
                {contact.avatarUrl ? (
                  <img
                    src={contact.avatarUrl}
                    alt={contact.name || contact.email}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white shrink-0",
                      getAvatarColor(contact.email)
                    )}
                  >
                    {contact.name?.[0]?.toUpperCase() ||
                      contact.email[0].toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {contact.name && (
                    <p className="text-sm font-medium truncate text-[var(--foreground)]">
                      {contact.name}
                    </p>
                  )}
                  <p
                    className={cn(
                      "text-sm truncate",
                      contact.name
                        ? "text-[var(--muted-foreground)]"
                        : "text-[var(--foreground)]"
                    )}
                  >
                    {contact.email}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
