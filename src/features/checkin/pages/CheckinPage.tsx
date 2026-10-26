import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Button,
  Slider,
  NumberInput,
  ProgressRing,
  SectionHeader,
  showToast
} from "@shared/ui";
import { CheckCircle2, Send } from "lucide-react";

export const CheckinPage: React.FC = () => {
  const { t } = useTranslation();

  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState(8);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(2);
  const [energy, setEnergy] = useState(9);
  const [restingHr, setRestingHr] = useState(48);
  const [hrv, setHrv] = useState(85);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);

  const calculateReadiness = () => {
    const score = Math.round(
      sleepQuality * 3.5 +
      (11 - soreness) * 2.5 +
      (11 - stress) * 2.0 +
      energy * 2.0
    );
    return Math.min(100, Math.max(10, score));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const score = calculateReadiness();
    setReadinessScore(score);
    setSubmitted(true);
    showToast({
      title: "Check-in rögzítve",
      message: `Napi regenerációs index kiszámítva: ${score}%`,
      type: "success"
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <SectionHeader
        title={t("checkin.title")}
        description={t("checkin.subtitle")}
      />

      {submitted && readinessScore !== null && (
        <Card variant="elevated" radius="20" className="p-6 border-status-ready/30 bg-status-ready/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <ProgressRing
                value={readinessScore}
                size={110}
                strokeWidth={8}
                label="Index"
                unit="%"
                status="ready"
              />
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-status-ready" />
                  <h3 className="text-16 font-bold text-text-primary">
                    {t("checkin.submittedSuccess")}
                  </h3>
                </div>
                <p className="text-12 text-text-secondary mt-1">
                  A regenerációs szinted alapján a mai fő edzés intenzitása jóváhagyva.
                </p>
              </div>
            </div>

            <div className="rounded-12 bg-bg-surface px-4 py-2 border border-border-hairline text-center">
              <span className="text-[11px] font-bold text-text-secondary uppercase block">
                Ajánlott zóna
              </span>
              <span className="text-14 font-black text-status-ready block mt-0.5">
                Z4 Küszöb munka
              </span>
            </div>
          </div>
        </Card>
      )}

      <Card variant="surface" radius="20" className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Recovery Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Slider
              label={t("checkin.sleepHours")}
              value={sleepHours}
              onChange={setSleepHours}
              min={4}
              max={12}
              unit="óra"
              steps={[
                { value: 5, label: "5h" },
                { value: 7, label: "7h" },
                { value: 8, label: "8h Optimális" },
                { value: 10, label: "10h" }
              ]}
            />

            <Slider
              label={t("checkin.sleepQuality")}
              value={sleepQuality}
              onChange={setSleepQuality}
              min={1}
              max={10}
              unit="/ 10"
              statusColor={sleepQuality >= 8 ? "ready" : sleepQuality >= 5 ? "caution" : "rest"}
              steps={[
                { value: 1, label: "Nyugtalan" },
                { value: 5, label: "Átlagos" },
                { value: 10, label: "Tökéletes" }
              ]}
            />

            <Slider
              label={t("checkin.soreness")}
              value={soreness}
              onChange={setSoreness}
              min={1}
              max={10}
              unit="/ 10"
              statusColor={soreness >= 7 ? "rest" : soreness >= 4 ? "caution" : "ready"}
              steps={[
                { value: 1, label: "Semmi" },
                { value: 5, label: "Mérsékelt" },
                { value: 10, label: "Súlyos" }
              ]}
            />

            <Slider
              label={t("checkin.stress")}
              value={stress}
              onChange={setStress}
              min={1}
              max={10}
              unit="/ 10"
              statusColor={stress >= 7 ? "rest" : stress >= 4 ? "caution" : "ready"}
              steps={[
                { value: 1, label: "Nyugodt" },
                { value: 5, label: "Átlagos" },
                { value: 10, label: "Nagy stressz" }
              ]}
            />

            <Slider
              label={t("checkin.energy")}
              value={energy}
              onChange={setEnergy}
              min={1}
              max={10}
              unit="/ 10"
              statusColor={energy >= 8 ? "ready" : energy >= 5 ? "caution" : "rest"}
              steps={[
                { value: 1, label: "Kimerült" },
                { value: 5, label: "Átlagos" },
                { value: 10, label: "Csúcsforma" }
              ]}
            />
          </div>

          {/* Biometrics Inputs */}
          <div className="pt-6 border-t border-border-hairline grid grid-cols-1 sm:grid-cols-2 gap-6">
            <NumberInput
              label={t("checkin.restingHeartRate")}
              value={restingHr}
              onChange={setRestingHr}
              min={30}
              max={120}
              unit="bpm"
              hint="Nyugalmi pulzus ébredés után"
            />

            <NumberInput
              label={t("checkin.hrv")}
              value={hrv}
              onChange={setHrv}
              min={20}
              max={200}
              unit="ms"
              hint="Szívfrekvencia variabilitás (rMSSD)"
            />
          </div>

          {/* Subjective Notes */}
          <div className="pt-6 border-t border-border-hairline space-y-1.5">
            <label
              htmlFor="checkin-notes"
              className="block text-12 font-medium uppercase tracking-wider text-text-secondary"
            >
              {t("checkin.notes")}
            </label>
            <textarea
              id="checkin-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("checkin.notesPlaceholder")}
              className="w-full rounded-12 border border-border-hairline bg-bg-surface p-3.5 text-14 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            leftIcon={<Send className="h-4 w-4" />}
          >
            {t("checkin.submitBtn")}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CheckinPage;
