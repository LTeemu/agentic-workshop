"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    // Animate in on mount
    if (!mounted.current) {
      mounted.current = true;
      // Microtask so the DOM paints before we toggle
      queueMicrotask(() => setVisible(true));
    }
  }, []);

  const bg =
    toast.type === "error"
      ? "bg-red-600"
      : toast.type === "success"
        ? "bg-emerald-600"
        : "bg-zinc-800";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ pointerEvents: "auto" }}
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      } ${bg}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-white/60 hover:text-white"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
