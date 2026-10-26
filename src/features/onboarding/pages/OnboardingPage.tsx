import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { AthleteLevel, UserRole } from "@shared/types";
import {
  Card,
  Button,
  Input,
  Stepper,
  SegmentedControl,
  showToast
} from "@shared/ui";
import { Award, CheckCircle2 } from "lucide-react";

export const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUserProfile } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [sport, setSport] = useState(user?.sport || "Triatlon / Úszás");
  const [level, setLevel] = useState<AthleteLevel>(user?.level || "olympic");
  const [role, setRole] = useState<UserRole>(user?.role || "athlete");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      setUserProfile({
        ...user,
        sport,
        level,
        role,
        updatedAt: new Date().toISOString()
      });
    }
    setSaved(true);
    showToast({
      title: "Profil sikeresen frissítve",
      message: "Az edzéstervezési beállítások érvénybe léptek.",
      type: "success"
    });
    setTimeout(() => {
      navigate("/");
    }, 600);
  };

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <Stepper
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        steps={[
          { id: "1", label: "Fiók" },
          { id: "2", label: "Sportolói Profil" },
          { id: "3", label: "Befejezés" }
        ]}
      />

      <Card variant="surface" radius="28" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-12 bg-brand/10 text-brand">
            <Award className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-20 font-bold tracking-tight text-text-primary sm:text-28">
              {t("onboarding.title")}
            </h1>
            <p className="text-12 text-text-secondary sm:text-14">
              {t("onboarding.subtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label={t("onboarding.sportLabel")}
            required
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            placeholder={t("onboarding.sportPlaceholder")}
            hint="Válaszd ki a fő versenysportágadat a testreszabott metrikákhoz"
          />

          <div className="space-y-2">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              {t("onboarding.levelLabel")}
            </span>
            <SegmentedControl
              options={[
                { value: "olympic", label: "Olimpiai / Világkupa" },
                { value: "national", label: "Nemzeti Bajnoki" },
                { value: "hobby", label: "Amatőr Hobbi" }
              ]}
              value={level}
              onChange={(val) => setLevel(val as AthleteLevel)}
              fullWidth
            />
          </div>

          <div className="space-y-2">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              {t("onboarding.roleLabel")}
            </span>
            <SegmentedControl
              options={[
                { value: "athlete", label: t("onboarding.roleAthlete") },
                { value: "coach", label: t("onboarding.roleCoach") },
                { value: "specialist", label: t("onboarding.roleSpecialist") }
              ]}
              value={role}
              onChange={(val) => setRole(val as UserRole)}
              fullWidth
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            leftIcon={saved ? <CheckCircle2 className="h-4 w-4" /> : undefined}
          >
            {saved ? t("common.confirm") : t("onboarding.completeBtn")}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default OnboardingPage;
