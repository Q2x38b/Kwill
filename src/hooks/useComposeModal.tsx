import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { ComposeModal } from "@/components/email/ComposeModal";

interface ComposeModalContextType {
  isOpen: boolean;
  openCompose: () => void;
  closeCompose: () => void;
}

const ComposeModalContext = createContext<ComposeModalContextType | null>(null);

export function ComposeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCompose = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ComposeModalContext.Provider value={{ isOpen, openCompose, closeCompose }}>
      {children}
      <ComposeModal isOpen={isOpen} onClose={closeCompose} />
    </ComposeModalContext.Provider>
  );
}

export function useComposeModal() {
  const context = useContext(ComposeModalContext);
  if (!context) {
    throw new Error("useComposeModal must be used within ComposeModalProvider");
  }
  return context;
}
