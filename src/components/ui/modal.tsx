"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The site's one modal, built on the native <dialog> element.
 *
 * showModal() puts it in the browser's top layer, makes the rest of the page
 * inert (focus can't leave), moves focus inside, closes on Esc and restores
 * focus on close: all platform behaviour, no portals or focus-trap scripts.
 * Every overlay (keybind sheet, command palette, photo viewer, mobile menu)
 * uses it, so they share one tested implementation.
 */
export function Modal({
  open,
  onClose,
  label,
  labelledBy,
  variant = "center",
  className,
  closeButton = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name (or use labelledBy). */
  label?: string;
  labelledBy?: string;
  variant?: "center" | "sheet" | "bare";
  className?: string;
  closeButton?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  // Layout effect: opened/closed before paint, so the first frame is already modal.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
    }
    if (!open && d.open) {
      d.close();
      // Return focus now. WebKit does it a moment later, so a key pressed right after
      // Esc would land on the closed dialog's button (and keybinds would ignore it).
      if (d.contains(document.activeElement)) {
        const back = opener.current;
        if (back instanceof HTMLElement && back.isConnected && back !== document.body) back.focus({ preventScroll: true });
        else (document.activeElement as HTMLElement | null)?.blur();
      }
      opener.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      data-variant={variant}
      // Esc: let React state own visibility.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Clicks on the backdrop land on the <dialog> element itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      // The close event is dispatched later (a task): if the dialog was reopened meanwhile,
      // this event belongs to the previous opening and must not close the new one.
      onClose={(e) => {
        if (open && !e.currentTarget.open) onClose();
      }}
      className={cn("modal", className)}
    >
      {closeButton ? (
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-md text-subtle-foreground hover:bg-white/[0.06] hover:text-foreground">
          <X className="size-4" />
        </button>
      ) : null}
      {children}
    </dialog>
  );
}
