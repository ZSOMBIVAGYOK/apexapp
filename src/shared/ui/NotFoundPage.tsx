import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass, ArrowLeft } from "lucide-react";
import { Button } from "./Button";

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <main
      role="main"
      className="flex min-h-[75vh] flex-col items-center justify-center px-4 text-center select-none"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-28 bg-bg-surface border border-border-hairline text-brand mb-6 shadow-elevated">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-40 sm:text-64 font-bold tracking-tight tabular-nums text-text-primary">
        404
      </h1>
      <h2 className="mt-2 text-20 font-semibold text-text-primary">
        {t("notFound.title")}
      </h2>
      <p className="mt-2 max-w-md text-14 text-text-secondary leading-normal">
        {t("notFound.desc")}
      </p>
      <Link to="/" className="mt-6">
        <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          {t("notFound.backHome")}
        </Button>
      </Link>
    </main>
  );
};

export default NotFoundPage;
