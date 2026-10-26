import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@features/auth/authStore";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowIncompleteOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowIncompleteOnboarding = false
}) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center bg-bg-primary text-text-primary"
      >
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden="true" />
        <p className="mt-4 text-12 font-medium text-text-secondary">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user has not completed onboarding and this route requires it, redirect to /onboarding
  if (
    !user.onboardingCompleted &&
    !allowIncompleteOnboarding &&
    location.pathname !== "/onboarding" &&
    location.pathname !== "/privacy"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};
