import { create } from "zustand";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  durationMs?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newItem: ToastItem = {
      id,
      type: "info",
      durationMs: 4000,
      ...toast
    };

    set((state) => ({
      toasts: [...state.toasts, newItem]
    }));

    if (newItem.durationMs && newItem.durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }));
      }, newItem.durationMs);
    }

    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));

// Quick hook helper
export const showToast = (toast: Omit<ToastItem, "id">) => {
  return useToastStore.getState().addToast(toast);
};
