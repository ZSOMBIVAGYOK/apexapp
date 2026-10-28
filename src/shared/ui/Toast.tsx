import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, ToastItem } from "./toastStore";

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Értesítések"
      aria-live="polite"
      className="fixed bottom-24 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none md:bottom-8 md:right-8 md:left-auto md:items-end md:w-auto"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  const icons = {
    info: <Info className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />,
    success: <CheckCircle2 className="h-4 w-4 text-status-ready shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle className="h-4 w-4 text-status-caution shrink-0" aria-hidden="true" />,
    error: <AlertCircle className="h-4 w-4 text-status-rest shrink-0" aria-hidden="true" />
  };

  return (
    <div
      role="status"
      className="pointer-events-auto rounded-full glass-regular border border-border/80 px-4 py-2.5 shadow-glass-md flex items-center gap-3 transition-all duration-280 ease-spring max-w-md select-none"
    >
      <div className="shrink-0">{icons[toast.type || "info"]}</div>

      <div className="min-w-0 flex-1">
        <span className="text-14 font-medium text-text-primary">
          {toast.title}
        </span>
        {(toast.description || toast.message) && (
          <span className="text-12 text-text-secondary ml-1.5 hidden sm:inline">
            · {toast.description || toast.message}
          </span>
        )}
      </div>

      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="text-12 font-semibold text-brand hover:underline px-1 shrink-0"
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Értesítés bezárása"
        className="touch-target text-text-secondary hover:text-text-primary p-0.5 rounded-full transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
