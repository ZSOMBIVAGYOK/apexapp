import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass, ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <main
      role="main"
      className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-card border border-brand-muted text-apex-400 mb-6 shadow-xl">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-100 sm:text-4xl">404</h1>
      <h2 className="mt-2 text-xl font-semibold text-slate-200">{t("notFound.title")}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">{t("notFound.desc")}</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-apex-500 px-5 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-apex-400 focus:outline-none focus:ring-2 focus:ring-apex-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("notFound.backHome")}
      </Link>
    </main>
  );
};

export default NotFoundPage;
