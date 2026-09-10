import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// One of only two places shadow is allowed (the other is dropdown menus).
// Motion is a response to the user action that opened it — a short fade + rise,
// nothing on close beyond unmount. Escape and backdrop click both close.
interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  className?: string;
}

export function Modal({ open, onClose, children, labelledBy, className = "" }: ModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6"
      style={{ backgroundColor: "rgb(15 23 41 / 0.4)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`w-full max-w-[960px] rounded-card bg-surface shadow-overlay outline-none transition duration-150 ${
          entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        } ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
