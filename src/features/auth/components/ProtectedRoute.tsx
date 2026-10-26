import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@features/auth/authStore";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center bg-brand-dark text-slate-200"
      >
        <Loader2 className="h-10 w-10 animate-spin text-apex-500" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-slate-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};
