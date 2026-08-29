"use client";

/**
 * Toast Notifications
 * -------------------
 * Confirms that save / unsave / sign-in / sign-out actually happened, and
 * surfaces API errors without a blocking `alert()`.
 *
 * Written by hand rather than pulling in a toast library: the whole thing is
 * ~90 lines and adding a dependency for it would not earn its weight.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3500;

let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextToastId++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        aria-live="polite" announces toasts to screen readers without
        interrupting whatever the user is currently doing.
      */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg max-w-sm text-sm ${
              toast.variant === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : toast.variant === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <span aria-hidden="true">
              {toast.variant === "success" ? "✓" : toast.variant === "error" ? "!" : "i"}
            </span>
            <p className="flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-current opacity-50 hover:opacity-100 leading-none"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
