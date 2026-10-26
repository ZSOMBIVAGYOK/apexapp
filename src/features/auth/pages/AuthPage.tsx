import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@shared/lib/firebase";
import { useAuthStore } from "@features/auth/authStore";
import { Card, Button, Input, showToast } from "@shared/ui";
import { Flame, Sparkles, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginDemo } = useAuthStore();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setErrorMsg(t("auth.invalidCredentials"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      showToast({
        title: "Sikeres bejelentkezés",
        message: "Üdvözlünk az Apex platformon!",
        type: "success"
      });
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.invalidCredentials");
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
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
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-8">
      <Card variant="surface" radius="28" className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-20 bg-brand text-white shadow-sm">
            <Flame className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-24 font-bold tracking-tight text-text-primary">
            {t("auth.title")}
          </h1>
          <p className="text-12 text-text-secondary sm:text-14">
            {t("auth.subtitle")}
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-12 border border-status-rest/30 bg-status-rest/10 p-3 text-12 text-status-rest"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            leftIcon={isRegistering ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          >
            {isRegistering ? t("auth.submitRegister") : t("auth.submitLogin")}
          </Button>
        </form>

        <div className="pt-4 border-t border-border-hairline text-center space-y-3">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-12 font-medium text-brand hover:underline"
          >
            {isRegistering ? t("auth.switchToLogin") : t("auth.switchToRegister")}
          </button>

          <div>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              leftIcon={<Sparkles className="h-4 w-4 text-brand" />}
              onClick={handleDemoLogin}
            >
              {t("auth.demoLogin")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuthPage;
