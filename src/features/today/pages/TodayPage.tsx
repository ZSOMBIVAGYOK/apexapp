import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  Card,
  StatTile,
  ProgressRing,
  Button,
  Badge,
  SourceBadge,
  ConfidenceMeter,
  showToast
} from "@shared/ui";
import {
  Activity,
  Dumbbell,
  Droplets,
  Play,
  CheckCircle2,
  Clock,
  Plus
} from "lucide-react";

export const TodayPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [waterLiters, setWaterLiters] = useState(2.5);
  const [workoutStarted, setWorkoutStarted] = useState(false);

  const handleAddWater = () => {
    setWaterLiters((prev) => +(prev + 0.25).toFixed(2));
    showToast({
      title: "+250 ml víz rögzítve",
      message: `Napi folyadékbevitel: ${+(waterLiters + 0.25).toFixed(2)} liter`,
      type: "success"
    });
  };

  const handleToggleWorkout = () => {
    const next = !workoutStarted;
    setWorkoutStarted(next);
    showToast({
      title: next ? "Edzés blokk elindítva" : "Edzés leállítva",
      message: next ? "Pulzus és laktát-küszöb követés aktív" : "Edzésnapló frissítve",
      type: next ? "info" : "success"
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              {user?.sport || "Triatlon"}
            </Badge>
            <Badge variant="outline" size="sm">
              {user?.level || "Olimpiai keret"}
            </Badge>
          </div>
          <h1 className="text-28 sm:text-40 font-bold tracking-tight text-text-primary">
            {t("today.greeting")}, {user?.displayName || "Sportoló"}
          </h1>
          <p className="text-14 text-text-secondary">
            {t("today.recoveryStatus")}
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Activity className="h-4 w-4" />}
          onClick={() => navigate("/checkin")}
        >
          {t("today.quickCheckinBtn")}
        </Button>
      </div>

      {/* Hero Readiness Overview Card */}
      <Card variant="surface" radius="28" className="p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <ProgressRing
              value={92}
              label="Regeneráció"
              unit="%"
              size={140}
              status="ready"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-status-ready" />
                <span className="text-12 font-bold uppercase tracking-wider text-status-ready">
                  Kiváló állapot
                </span>
                <ConfidenceMeter level="high" score={96} />
              </div>
              <h2 className="text-20 font-bold tracking-tight text-text-primary">
                Készen állsz a nagy intenzitású edzésre
              </h2>
              <p className="text-14 text-text-secondary max-w-lg leading-normal">
                A nyugalmi pulzus és a HRV trend paraszimpatikus dominanciát jelez. A mai tervezett laktát-küszöb blokk teljes volumene elvégezhető.
              </p>
            </div>
          </div>

          <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-border-hairline pt-4 md:pt-0 md:pl-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/checkin")}
            >
              Mérési részletek
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => navigate("/insights")}
            >
              ACWR Görbe
            </Button>
          </div>
        </div>
      </Card>

      {/* 4 Key Biometrics Cockpit Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label={t("today.hrvMetric")}
          value={88}
          unit="ms"
          status="ready"
          trend={{ direction: "up", value: "+12%", isGood: true }}
          subtext="Átlag: 82 ms"
          topRight={<SourceBadge source="WHOOP" />}
        />
        <StatTile
          label="Nyugalmi pulzus"
          value={48}
          unit="bpm"
          status="ready"
          trend={{ direction: "down", value: "-3 bpm", isGood: true }}
          subtext="Alvási minimum: 44 bpm"
          topRight={<SourceBadge source="Garmin" />}
        />
        <StatTile
          label={t("today.sleepMetric")}
          value="8.2"
          unit="óra"
          status="ready"
          trend={{ direction: "up", value: "91% minőség", isGood: true }}
          subtext="1h 45m mélyalvás"
          topRight={<ConfidenceMeter level="high" score={94} />}
        />
        <StatTile
          label={t("nutrition.hydration")}
          value={waterLiters}
          unit="/ 3.5 l"
          status="ready"
          subtext={`${Math.round((waterLiters / 3.5) * 100)}% cél elérve`}
          topRight={
            <button
              type="button"
              onClick={handleAddWater}
              className="rounded-8 bg-brand/10 px-2 py-0.5 text-12 font-bold text-brand hover:bg-brand/20 transition-colors"
            >
              +250ml
            </button>
          }
        />
      </div>

      {/* Today's Workout & Nutrition Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planned Session */}
        <Card variant="surface" radius="20" className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-brand" aria-hidden="true" />
                <h3 className="text-16 font-semibold tracking-tight text-text-primary">
                  {t("today.plannedSession")}
                </h3>
              </div>
              <Badge variant="neutral" size="sm">
                10:00 - 11:30
              </Badge>
            </div>

            <div className="rounded-16 border border-border-hairline bg-bg-elevated p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-14 font-bold text-text-primary">
                    5 x 400m Laktát-küszöb sorozat (Úszás)
                  </h4>
                  <p className="text-12 text-text-secondary mt-0.5">
                    Célterhelés: RPE 8.5 • Z4 pulzustartomány (168-175 bpm)
                  </p>
                </div>
                <Badge variant="caution" size="sm">
                  RPE 8.5
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-12 text-text-secondary pt-2 border-t border-border-hairline">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  90 perc
                </span>
                <span>•</span>
                <span>Tervezett terhelés: 120 TSS</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant={workoutStarted ? "secondary" : "primary"}
              fullWidth
              leftIcon={
                workoutStarted ? (
                  <CheckCircle2 className="h-4 w-4 text-status-ready" />
                ) : (
                  <Play className="h-4 w-4" />
                )
              }
              onClick={handleToggleWorkout}
            >
              {workoutStarted ? "Edzés folyamatban (Kattints a befejezéshez)" : t("training.startSession")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/training")}
            >
              Terv
            </Button>
          </div>
        </Card>

        {/* Nutrition Summary */}
        <Card variant="surface" radius="20" className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-brand" aria-hidden="true" />
                <h3 className="text-16 font-semibold tracking-tight text-text-primary">
                  {t("nutrition.title")}
                </h3>
              </div>
              <span className="text-14 font-bold text-text-primary tabular-nums">
                2 850 / 3 450 kcal
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-12 text-text-secondary mb-1">
                  <span>{t("nutrition.protein")}</span>
                  <span className="tabular-nums font-medium text-text-primary">155g / 185g (84%)</span>
                </div>
                <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                  <div className="bg-brand h-1.5 rounded-full" style={{ width: "84%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-12 text-text-secondary mb-1">
                  <span>{t("nutrition.carbs")}</span>
                  <span className="tabular-nums font-medium text-text-primary">340g / 450g (75%)</span>
                </div>
                <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                  <div className="bg-brand h-1.5 rounded-full" style={{ width: "75%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-12 text-text-secondary mb-1">
                  <span>{t("nutrition.fats")}</span>
                  <span className="tabular-nums font-medium text-text-primary">58g / 75g (77%)</span>
                </div>
                <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                  <div className="bg-brand h-1.5 rounded-full" style={{ width: "77%" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
            <span className="text-12 text-text-secondary">Dietetikus: Molnár Eszter</span>
            <Button
              variant="tertiary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => navigate("/nutrition")}
            >
              Étkezés rögzítése
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TodayPage;
