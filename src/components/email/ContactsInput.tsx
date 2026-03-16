import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

interface Contact {
  _id: string;
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

export function ContactsInput({
  value,
  onChange,
  placeholder = "Recipients",
  className,
}: ContactsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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
    (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInputValue("");
    },
    [value, onChange]
  );

  const removeEmail = useCallback(
    (email: string) => {
      onChange(value.filter((e) => e !== email));
    },
    [value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      e.preventDefault();
      if (showSuggestions && suggestions[selectedIndex]) {
        addEmail(suggestions[selectedIndex].email);
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
    addEmail(contact.email);
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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[40px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Email chips */}
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--secondary)] text-sm"
          >
            <span className="truncate max-w-[150px]">{email}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="p-0.5 hover:bg-[var(--muted)] rounded-full transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

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
            className="absolute top-full left-0 right-0 mt-1 bg-[var(--popover)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50"
          >
            {suggestions.map((contact, index) => (
              <button
                key={contact._id}
                type="button"
                onClick={() => handleSuggestionClick(contact)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-[var(--accent)]"
                    : "hover:bg-[var(--accent)]"
                )}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-medium text-[var(--primary-foreground)] shrink-0">
                  {contact.name?.[0]?.toUpperCase() ||
                    contact.email[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {contact.name && (
                    <p className="text-sm font-medium truncate">
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
