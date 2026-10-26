import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@shared/lib/firebase";
import { useAuthStore } from "@features/auth/authStore";
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
    navigate("/");
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-2xl sm:p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-apex-400 to-apex-600 text-brand-dark shadow-lg shadow-apex-500/20 mb-3">
            <Flame className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black text-slate-100">{t("auth.title")}</h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">{t("auth.subtitle")}</p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              {t("auth.emailLabel")}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className="w-full rounded-xl border border-brand-muted bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-apex-500 focus:outline-none focus:ring-1 focus:ring-apex-500"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              {t("auth.passwordLabel")}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              className="w-full rounded-xl border border-brand-muted bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-apex-500 focus:outline-none focus:ring-1 focus:ring-apex-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-apex-500 py-3 text-sm font-bold text-brand-dark shadow-lg shadow-apex-500/20 transition-all hover:bg-apex-400 disabled:opacity-50"
          >
            {isRegistering ? (
              <>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {t("auth.submitRegister")}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {t("auth.submitLogin")}
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-brand-muted text-center space-y-3">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-medium text-apex-400 hover:text-apex-300 transition-colors"
          >
            {isRegistering ? t("auth.switchToLogin") : t("auth.switchToRegister")}
          </button>

          <div>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-apex-500/30 bg-apex-500/10 py-2.5 text-xs font-semibold text-apex-400 transition-all hover:bg-apex-500/20"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("auth.demoLogin")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
