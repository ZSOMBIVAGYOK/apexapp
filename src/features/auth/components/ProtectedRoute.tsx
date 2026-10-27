import React, { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@features/auth/authStore";
import { triggerEmailVerification } from "@features/auth/authService";
import { useTranslation } from "react-i18next";
import { Loader2, MailCheck, RefreshCw, LogOut, ShieldCheck } from "lucide-react";
import { Card, Button, showToast } from "@shared/ui";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowIncompleteOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowIncompleteOnboarding = false
}) => {
  const { user, firebaseUser, isLoading, isProfileLoading, signOut } = useAuthStore();
  const location = useLocation();
  const { t } = useTranslation();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // App Start Gating: wait until BOTH the Firebase Auth state AND the Firestore profile are fully resolved
  if (isLoading || isProfileLoading) {
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

  // Enforce email verification for email+password accounts before accessing the app
  const isPasswordUser = firebaseUser?.providerData?.some((p) => p.providerId === "password");
  if (firebaseUser && isPasswordUser && !firebaseUser.emailVerified) {
    const handleResend = async () => {
      setIsResending(true);
      try {
        await triggerEmailVerification();
        showToast({
          title: "Megerősítő levél elküldve",
          message: `Elküldtük az aktiváló linket a(z) ${firebaseUser.email} címre.`,
          type: "success"
        });
      } catch {
        showToast({
          title: "Hiba az újraküldéskor",
          message: "Kérjük, várj 1 percet a következő kérés előtt.",
          type: "error"
        });
      } finally {
        setIsResending(false);
      }
    };

    const handleCheckVerification = async () => {
      setIsChecking(true);
      try {
        await firebaseUser.reload();
        if (firebaseUser.emailVerified) {
          showToast({
            title: "Sikeres megerősítés!",
            message: "Köszönjük! Az alkalmazás most betöltődik.",
            type: "success"
          });
          window.location.reload();
        } else {
          showToast({
            title: "Még nincs megerősítve",
            message: "Kérjük, kattints a postafiókodba érkezett aktiváló linkre, majd próbáld újra.",
            type: "warning"
          });
        }
      } catch {
        showToast({
          title: "Hiba az ellenőrzéskor",
          message: "Kérjük, próbáld újra később.",
          type: "error"
        });
      } finally {
        setIsChecking(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8 bg-bg-primary text-text-primary">
        <Card variant="surface" radius="28" className="w-full max-w-md p-6 sm:p-8 space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-20 bg-brand/15 text-brand shadow-sm">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-20 font-bold tracking-tight text-text-primary">
              Erősítsd meg az e-mail címedet
            </h1>
            <p className="text-13 text-text-secondary leading-relaxed">
              A béta verzióban a sportolói adatok és az egészségügyi naplók védelme érdekében kérjük, erősítsd meg a fiókodat.
            </p>
            <p className="text-12 font-medium text-brand font-mono pt-1">
              {firebaseUser.email}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              fullWidth
              isLoading={isChecking}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={handleCheckVerification}
            >
              Már megerősítettem (Ellenőrzés)
            </Button>

            <Button
              variant="secondary"
              fullWidth
              isLoading={isResending}
              onClick={handleResend}
            >
              Megerősítő link újraküldése
            </Button>

            <Button
              variant="ghost"
              size="sm"
              fullWidth
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={() => signOut()}
            >
              Kijelentkezés
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-2 text-10 text-text-tertiary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>GDPR Art. 9 Védett Egészségügyi Rendszer</span>
          </div>
        </Card>
      </div>
    );
  }

  // If user has not completed onboarding and this route requires it, redirect to /onboarding
  if (
    !user.onboardingCompleted &&
    !allowIncompleteOnboarding &&
    location.pathname !== "/onboarding" &&
    location.pathname !== "/privacy" &&
    location.pathname !== "/terms"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user HAS completed onboarding, never show the onboarding wizard again
  if (user.onboardingCompleted && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return children;
};
