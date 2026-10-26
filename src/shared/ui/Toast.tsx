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
      className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none md:bottom-6 md:right-6 md:left-auto md:w-96"
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

  const borderColors = {
    info: "border-brand/30",
    success: "border-status-ready/30",
    warning: "border-status-caution/30",
    error: "border-status-rest/30"
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-16 border bg-bg-surface/95 backdrop-blur-md p-4 shadow-elevated flex items-start gap-3 transition-all duration-200 ease-apex-out ${
        borderColors[toast.type || "info"]
      }`}
    >
      <div className="mt-0.5">{icons[toast.type || "info"]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-14 font-semibold text-text-primary leading-tight">
          {toast.title}
        </h4>
        {(toast.description || toast.message) && (
          <p className="text-12 text-text-secondary mt-1 leading-normal">
            {toast.description || toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Értesítés bezárása"
        className="text-text-secondary hover:text-text-primary p-1 rounded-8 -mr-1 -mt-1 transition-colors"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
