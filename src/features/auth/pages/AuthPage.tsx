import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAuthStore } from "@features/auth/authStore";
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  triggerPasswordReset,
  triggerEmailVerification,
  getAuthErrorMessageKey
} from "@features/auth/authService";
import { GlassCard, Button, Input, SegmentedControl, showToast } from "@shared/ui";
import { Flame, Sparkles, LogIn, UserPlus, AlertCircle, KeyRound, MailCheck, ShieldCheck } from "lucide-react";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginDemo, firebaseUser, user } = useAuthStore();

  const isRegistrationDisabled = import.meta.env.VITE_DISABLE_REGISTRATION === "true";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in
  React.useEffect(() => {
    if (user) {
      if (user.onboardingCompleted) {
        navigate("/");
      } else {
        navigate("/onboarding");
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === "register" && isRegistrationDisabled) {
      setErrorMsg("A béta regisztráció jelenleg szünetel.");
      return;
    }

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setErrorMsg(t("auth.errors.invalidCredentials"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        const { profile } = await registerWithEmail(email, password);
        if (displayName.trim()) {
          const { saveUserProfileToFirestore } = await import("@features/auth/authService");
          await saveUserProfileToFirestore(profile.uid, { displayName });
        }
        showToast({
          title: t("common.appName"),
          message: "Sikeres regisztráció! Kérjük, állítsd be sportolói profilodat.",
          type: "success"
        });
        navigate("/onboarding");
      } else {
        const { profile } = await loginWithEmail(email, password);
        showToast({
          title: t("common.appName"),
          message: `Üdv újra, ${profile.displayName || "Sportoló"}!`,
          type: "success"
        });
        if (profile.onboardingCompleted) {
          navigate("/");
        } else {
          navigate("/onboarding");
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "auth/generic";
      const key = getAuthErrorMessageKey(code);
      setErrorMsg(t(key));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const { profile } = await loginWithGoogle();
      showToast({
        title: "Google azonosítás sikeres",
        message: `Üdvözlünk, ${profile.displayName || "Sportoló"}!`,
        type: "success"
      });
      if (profile.onboardingCompleted) {
        navigate("/");
      } else {
        navigate("/onboarding");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "auth/generic";
      const key = getAuthErrorMessageKey(code);
      setErrorMsg(t(key));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg(t("auth.errors.invalidEmail"));
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await triggerPasswordReset(email);
      setResetEmailSent(true);
      showToast({
        title: t("auth.resetPasswordTitle"),
        message: t("auth.resetLinkSent"),
        type: "info"
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "auth/generic";
      const key = getAuthErrorMessageKey(code);
      setErrorMsg(t(key));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await triggerEmailVerification();
      setVerificationSent(true);
      showToast({
        title: "E-mail ellenőrzés",
        message: t("auth.verificationSent"),
        type: "info"
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "auth/generic";
      setErrorMsg(t(getAuthErrorMessageKey(code)));
    }
  };

  const handleDemoLogin = () => {
    loginDemo("athlete");
    showToast({
      title: "Gyors Demó Mód",
      message: "Bejelentkezve mint Kovács Zsombor (Olimpikon)",
      type: "info"
    });
    navigate("/");
  };

  return (
    <div className="relative flex min-h-[90vh] items-center justify-center px-4 py-8">
      <GlassCard variant="regular" className="w-full max-w-md p-6 sm:p-9 space-y-6 shadow-glass-lg border border-border/60">
        {/* Brand header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-20 bg-brand text-white shadow-glass-sm">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-18 font-black tracking-[0.22em] text-text-primary uppercase font-mono">
              APEX
            </span>
          </div>
          <div className="w-12 h-0.5 bg-brand/60 mx-auto rounded-full" />
          <h1 className="text-24 font-bold tracking-tight text-text-primary">
            {t("auth.title")}
          </h1>
          <p className="text-13 text-text-secondary">
            {t("auth.subtitle")}
          </p>
        </div>

        {/* Unverified email notice if logged in via email */}
        {firebaseUser && !firebaseUser.emailVerified && (
          <div className="flex flex-col gap-2 rounded-12 border border-status-caution/30 bg-status-caution/10 p-3 text-12 text-status-caution">
            <div className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t("auth.verificationNotice")}</span>
            </div>
            {!verificationSent ? (
              <button
                type="button"
                onClick={handleResendVerification}
                className="touch-target text-left font-medium underline hover:text-text-primary py-2"
              >
                {t("auth.resendVerification")}
              </button>
            ) : (
              <span className="font-semibold">{t("auth.verificationSent")}</span>
            )}
          </div>
        )}

        {/* Error alert */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-12 border border-status-rest/30 bg-status-rest/10 p-3 text-12 text-status-rest"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Password Reset View */}
        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-16 font-bold text-text-primary">
                {t("auth.resetPasswordTitle")}
              </h2>
              <p className="text-12 text-text-secondary">
                {t("auth.resetPasswordDesc")}
              </p>
            </div>

            <Input
              id="reset-email"
              type="email"
              label={t("auth.emailLabel")}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
            />

            {resetEmailSent && (
              <p className="text-12 font-medium text-status-ready">
                {t("auth.resetLinkSent")}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isSubmitting}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              {t("auth.sendResetLink")}
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setResetEmailSent(false);
              }}
              className="touch-target w-full text-center text-12 font-medium text-brand hover:underline py-2.5"
            >
              {t("auth.backToLogin")}
            </button>
          </form>
        ) : (
          /* Main Auth Form */
          <>
            {!isRegistrationDisabled ? (
              <SegmentedControl
                options={[
                  { value: "login", label: t("auth.loginTab") },
                  { value: "register", label: t("auth.registerTab") }
                ]}
                value={mode}
                onChange={(val) => {
                  setMode(val as "login" | "register");
                  setErrorMsg(null);
                }}
                fullWidth
              />
            ) : (
              <div className="rounded-12 bg-status-caution/10 border border-status-caution/30 p-2.5 text-center text-12 text-status-caution">
                A béta regisztráció jelenleg szünetel. Csak meglévő fiókkal lehet bejelentkezni.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && !isRegistrationDisabled && (
                <Input
                  id="auth-name"
                  type="text"
                  label={t("auth.nameLabel")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                />
              )}

              <Input
                id="auth-email"
                type="email"
                label={t("auth.emailLabel")}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
              />

              <Input
                id="auth-password"
                type="password"
                label={t("auth.passwordLabel")}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
              />

              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg(null);
                    }}
                    className="touch-target inline-flex items-center text-12 text-brand hover:underline py-2.5"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
                leftIcon={
                  mode === "register" ? (
                    <UserPlus className="h-4 w-4" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )
                }
              >
                {mode === "register"
                  ? t("auth.submitRegister")
                  : t("auth.submitLogin")}
              </Button>
            </form>

            {/* Social Authentication */}
            <div className="space-y-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-hairline" />
                </div>
                <span className="relative bg-bg-surface px-3 text-12 text-text-tertiary">
                  {t("auth.orContinueWith")}
                </span>
              </div>

              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  <span className="font-semibold text-text-primary mr-1">G</span> Google bejelentkezés
                </Button>
              </div>
            </div>

            {/* Quick Demo Login pass (Only in local development) */}
            {!import.meta.env.PROD && (
              <div className="pt-3 border-t border-border-hairline space-y-2">
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  fullWidth
                  leftIcon={<Sparkles className="h-3.5 w-3.5 text-brand" />}
                  onClick={handleDemoLogin}
                >
                  {t("auth.demoLogin")} (Fejlesztői mód)
                </Button>
              </div>
            )}
          </>
        )}

        {/* Security watermark */}
        <div className="flex items-center justify-center gap-1.5 pt-2 text-10 text-text-tertiary">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>GDPR Art. 9 Védett Élsportolói Adatkezelés</span>
        </div>
      </GlassCard>
    </div>
  );
};

export default AuthPage;
