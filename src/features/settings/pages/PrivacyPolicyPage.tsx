import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, Button, SectionHeader, Badge } from "@shared/ui";
import { Shield, ArrowLeft, Lock, FileCheck, Database, UserCheck } from "lucide-react";

export const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 px-4">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => navigate(-1)}
      >
        {t("common.back")}
      </Button>

      <SectionHeader
        title={t("privacy.title")}
        description={t("privacy.subtitle")}
        badge={<Badge variant="brand">GDPR Art. 9</Badge>}
      />

      <div className="space-y-4">
        {/* Section 1 */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <Shield className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-16 font-bold">{t("privacy.controllerTitle")}</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            {t("privacy.controllerText")}
          </p>
        </Card>

        {/* Section 2 */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <Database className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-16 font-bold">{t("privacy.categoriesTitle")}</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            {t("privacy.categoriesText")}
          </p>
          <div className="mt-2 rounded-12 border border-border-hairline bg-bg-elevated p-3 text-12 text-text-tertiary">
            <strong>Adattárolás helye:</strong> Európai Gazdasági Térségen belüli (EEA) titkosított Firebase Cloud Firestore és Google Cloud adatbázisok, TLS 1.3 átviteli és AES-256 nyugalmi állapotú titkosítással.
          </div>
        </Card>

        {/* Section 3 */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <FileCheck className="h-5 w-5 text-status-ready" aria-hidden="true" />
            <h2 className="text-16 font-bold">{t("privacy.legalBasisTitle")}</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            {t("privacy.legalBasisText")}
          </p>
          <p className="text-12 text-text-tertiary">
            Hozzájárulásod bármikor, indoklás nélkül visszavonható a Beállítások menüben vagy fiókod törlésével. A visszavonás nem érinti a hozzájáruláson alapuló, a visszavonás előtti adatkezelés jogszerűségét.
          </p>
        </Card>

        {/* Section 4 */}
        <Card variant="surface" radius="20" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-text-primary">
            <UserCheck className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-16 font-bold">{t("privacy.rightsTitle")}</h2>
          </div>
          <p className="text-14 leading-relaxed text-text-secondary">
            {t("privacy.rightsText")}
          </p>
          <div className="flex items-center gap-2 pt-2 text-12 text-status-ready">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>Automatizált GDPR JSON export és azonnali végleges törlés biztosított.</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
