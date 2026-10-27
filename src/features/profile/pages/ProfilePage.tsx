import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  Card,
  Button,
  Input,
  NumberInput,
  Slider,
  SegmentedControl,
  Toggle,
  Chip,
  Badge,
  Avatar,
  SectionHeader,
  BottomSheet,
  WeekdayPicker,
  showToast
} from "@shared/ui";
import { SportSelector } from "@features/sports/components/SportSelector";
import { getSportById } from "@shared/lib/sports";
import {
  User,
  Activity,
  Calendar,
  Target,
  Utensils,
  Share2,
  Globe,
  Edit2,
  ChevronLeft
} from "lucide-react";
import {
  AthleteLevel,
  DataMode,
  NutritionGoal,
  SupportMode,
  UnitSystem
} from "@shared/types";

export const ProfilePage: React.FC = () => {
  const { i18n } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const navigate = useNavigate();

  // Active section modal state
  type SectionKey =
    | "basic"
    | "sports"
    | "trainingDays"
    | "goals"
    | "nutrition"
    | "support"
    | "locale";
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form local drafts for each section
  // Form local drafts for each section
  // 1. Basic
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [sex, setSex] = useState(user?.sex || "prefer_not_to_say");
  const [heightCm, setHeightCm] = useState(user?.heightCm || 175);
  const [weightKg, setWeightKg] = useState(user?.weightKg || 70);

  // 2. Sports
  const [sports, setSports] = useState<string[]>(user?.sports || (user?.sport ? [user.sport] : []));
  const [mainSport, setMainSport] = useState<string>(user?.mainSport || user?.sport || "");
  const [level, setLevel] = useState<AthleteLevel>(user?.level || "hobby");

  // 3. Training Days
  const [trainingDays, setTrainingDays] = useState<number[]>(user?.trainingDays || []);
  const [sleepHoursBaseline, setSleepHoursBaseline] = useState(user?.sleepHoursBaseline || 8);
  const [restingHr, setRestingHr] = useState(user?.restingHeartRateBaseline || 48);
  const [injuries, setInjuries] = useState(user?.currentInjuries || "");

  // 4. Goals
  const [targetCompetition, setTargetCompetition] = useState(user?.targetCompetition || "");
  const [targetCompetitionDate, setTargetCompetitionDate] = useState(user?.targetCompetitionDate || "");
  const [goals, setGoals] = useState(user?.goals || "");

  // 5. Nutrition
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal>(user?.nutritionGoal || "performance");
  const [plateBasedViewOnly, setPlateBasedViewOnly] = useState(user?.plateBasedViewOnly || false);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(user?.dietaryPreferences || []);
  const [allergiesIntolerances, setAllergiesIntolerances] = useState<string[]>(user?.allergiesIntolerances || []);

  // 6. Support
  const [dataMode, setDataMode] = useState<DataMode>(user?.dataMode || "hybrid");
  const [supportMode, setSupportMode] = useState<SupportMode[]>(user?.supportMode || ["solo"]);

  // 7. Locale
  const [locale, setLocale] = useState<"hu" | "en">(user?.locale || "hu");
  const [units, setUnits] = useState<UnitSystem>(user?.units || "metric");

  // Open modal handler resetting state to store
  const handleOpenSection = (section: SectionKey) => {
    if (section === "basic") {
      setDisplayName(user?.displayName || "");
      setBirthDate(user?.birthDate || "");
      setSex(user?.sex || "prefer_not_to_say");
      setHeightCm(user?.heightCm || 175);
      setWeightKg(user?.weightKg || 70);
    } else if (section === "sports") {
      setSports(user?.sports || (user?.sport ? [user.sport] : []));
      setMainSport(user?.mainSport || user?.sport || "");
      setLevel(user?.level || "hobby");
    } else if (section === "trainingDays") {
      setTrainingDays(user?.trainingDays || []);
      setSleepHoursBaseline(user?.sleepHoursBaseline || 8);
      setRestingHr(user?.restingHeartRateBaseline || 48);
      setInjuries(user?.currentInjuries || "");
    } else if (section === "goals") {
      setTargetCompetition(user?.targetCompetition || "");
      setTargetCompetitionDate(user?.targetCompetitionDate || "");
      setGoals(user?.goals || "");
    } else if (section === "nutrition") {
      setNutritionGoal(user?.nutritionGoal || "performance");
      setPlateBasedViewOnly(user?.plateBasedViewOnly || false);
      setDietaryPreferences(user?.dietaryPreferences || []);
      setAllergiesIntolerances(user?.allergiesIntolerances || []);
    } else if (section === "support") {
      setDataMode(user?.dataMode || "hybrid");
      setSupportMode(user?.supportMode || ["solo"]);
    } else if (section === "locale") {
      setLocale(user?.locale || "hu");
      setUnits(user?.units || "metric");
    }
    setActiveSection(section);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!activeSection) return false;
    if (activeSection === "basic") {
      return (
        displayName !== (user?.displayName || "") ||
        birthDate !== (user?.birthDate || "") ||
        sex !== (user?.sex || "prefer_not_to_say") ||
        heightCm !== (user?.heightCm || 175) ||
        weightKg !== (user?.weightKg || 70)
      );
    }
    if (activeSection === "sports") {
      const origSports = user?.sports || (user?.sport ? [user.sport] : []);
      return (
        sports.length !== origSports.length ||
        sports.some((s) => !origSports.includes(s)) ||
        mainSport !== (user?.mainSport || user?.sport || "") ||
        level !== (user?.level || "hobby")
      );
    }
    if (activeSection === "trainingDays") {
      const origDays = user?.trainingDays || [];
      return (
        trainingDays.length !== origDays.length ||
        trainingDays.some((d) => !origDays.includes(d)) ||
        sleepHoursBaseline !== (user?.sleepHoursBaseline || 8) ||
        restingHr !== (user?.restingHeartRateBaseline || 48) ||
        injuries !== (user?.currentInjuries || "")
      );
    }
    if (activeSection === "goals") {
      return (
        targetCompetition !== (user?.targetCompetition || "") ||
        targetCompetitionDate !== (user?.targetCompetitionDate || "") ||
        goals !== (user?.goals || "")
      );
    }
    if (activeSection === "nutrition") {
      return (
        nutritionGoal !== (user?.nutritionGoal || "performance") ||
        plateBasedViewOnly !== (user?.plateBasedViewOnly || false) ||
        JSON.stringify(dietaryPreferences) !== JSON.stringify(user?.dietaryPreferences || []) ||
        JSON.stringify(allergiesIntolerances) !== JSON.stringify(user?.allergiesIntolerances || [])
      );
    }
    if (activeSection === "support") {
      return (
        dataMode !== (user?.dataMode || "hybrid") ||
        JSON.stringify(supportMode) !== JSON.stringify(user?.supportMode || ["solo"])
      );
    }
    if (activeSection === "locale") {
      return (
        locale !== (user?.locale || "hu") ||
        units !== (user?.units || "metric")
      );
    }
    return false;
  };

  const handleRequestClose = () => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(
        "Nem mentett módosításaid vannak. Biztosan be akarod zárni mentés nélkül?"
      );
      if (!confirmed) return;
    }
    setActiveSection(null);
  };

  const handleSaveSection = async () => {
    setIsSaving(true);
    try {
      if (activeSection === "basic") {
        await updateProfile({
          displayName: displayName.trim(),
          birthDate,
          sex: sex as "male" | "female" | "prefer_not_to_say",
          heightCm,
          weightKg
        });
      } else if (activeSection === "sports") {
        await updateProfile({
          sports,
          sport: mainSport,
          mainSport,
          level
        });
      } else if (activeSection === "trainingDays") {
        await updateProfile({
          trainingDays,
          trainingDaysPerWeek: trainingDays.length,
          sleepHoursBaseline,
          restingHeartRateBaseline: restingHr,
          currentInjuries: injuries.trim()
        });
      } else if (activeSection === "goals") {
        await updateProfile({
          targetCompetition: targetCompetition.trim(),
          targetCompetitionDate,
          goals: goals.trim()
        });
      } else if (activeSection === "nutrition") {
        await updateProfile({
          nutritionGoal,
          plateBasedViewOnly,
          dietaryPreferences,
          allergiesIntolerances
        });
      } else if (activeSection === "support") {
        await updateProfile({
          dataMode,
          supportMode
        });
      } else if (activeSection === "locale") {
        if (locale !== i18n.language) {
          i18n.changeLanguage(locale);
        }
        await updateProfile({
          locale,
          units
        });
      }

      showToast({
        title: "Mentve ✓",
        message: "A profil módosításai sikeresen frissítve lettek.",
        type: "success"
      });
      setActiveSection(null);
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült menteni a beállításokat.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDietaryPref = (tag: string) => {
    setDietaryPreferences((prev) =>
      prev.includes(tag) ? prev.filter((p) => p !== tag) : [...prev, tag]
    );
  };

  const toggleAllergy = (tag: string) => {
    setAllergiesIntolerances((prev) =>
      prev.includes(tag) ? prev.filter((p) => p !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 px-4 sm:px-6">
      {/* Navigation and Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="inline-flex items-center gap-1.5 text-13 font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Vissza a beállításokhoz</span>
        </button>
      </div>

      <SectionHeader
        title="Sportolói Profil"
        description="Tekintsd át és szerkeszd az alapadatokat, sportágakat, edzésnapokat és táplálkozási irányelveket részletenként."
      />

      {/* Profile Header Card */}
      <Card variant="surface" radius="20" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={user?.displayName || "Sportoló"}
              size="lg"
              status="ready"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-18 font-bold text-text-primary">
                  {user?.displayName || "Kovács Zsombor"}
                </h2>
                {user?.roles?.map((r) => (
                  <Badge key={r} variant="brand" size="sm">
                    {r === "coach" ? "Edző" : r === "specialist" ? "Szakember" : "Sportoló"}
                  </Badge>
                ))}
              </div>
              <p className="text-12 text-text-secondary mt-0.5">
                {user?.email || "olimpikon@apex.hu"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="brand" size="sm">
                  {user?.mainSport || user?.sport
                    ? getSportById(user.mainSport || user.sport || "")?.nameHu || user.mainSport || user.sport
                    : "Sportág nincs megadva"}
                </Badge>
                {user?.level && (
                  <span className="text-11 text-text-tertiary uppercase font-mono">
                    {user.level} szint
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION CARDS */}
      <div className="grid grid-cols-1 gap-4">
        {/* 1. Alapadatok */}
        <Card variant="surface" radius="20" className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-15 font-bold text-text-primary">Alapadatok</h3>
                <p className="text-12 text-text-secondary">Név, születési dátum, nem, magasság és súly</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenSection("basic")}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Szerkesztés
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border-hairline text-13">
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Név</span>
              <span className="font-medium text-text-primary">{user?.displayName || "—"}</span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Születési idő</span>
              <span className="font-medium text-text-primary">{user?.birthDate || "—"}</span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Magasság</span>
              <span className="font-medium text-text-primary font-mono">{user?.heightCm ? `${user.heightCm} cm` : "—"}</span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Testsúly</span>
              <span className="font-medium text-text-primary font-mono">{user?.weightKg ? `${user.weightKg} kg` : "—"}</span>
            </div>
          </div>
        </Card>

        {/* 2. Sportok */}
        <Card variant="surface" radius="20" className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-15 font-bold text-text-primary">Sportok és versenyszint</h3>
                <p className="text-12 text-text-secondary">Fő sportág és választott edzés sportágak a katalógusból</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenSection("sports")}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Szerkesztés
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {user?.sports && user.sports.length > 0 ? (
                user.sports.map((sId) => {
                  const def = getSportById(sId);
                  const isMain = (user?.mainSport || user?.sport) === sId;
                  return (
                    <div
                      key={sId}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-12 text-13 font-medium border ${
                        isMain
                          ? "border-brand bg-brand/15 text-text-primary ring-1 ring-brand"
                          : "border-border-hairline bg-bg-surface text-text-primary"
                      }`}
                    >
                      <span>{def?.icon || "🏅"}</span>
                      <span>{def?.nameHu || sId}</span>
                      {isMain && (
                        <span className="text-10 font-bold text-brand uppercase tracking-wider ml-1">
                          (Fő sport)
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-13 text-text-tertiary italic">
                  Még nincs megadva sportág. Kattints a &ldquo;Szerkesztés&rdquo; gombra a választáshoz!
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* 3. Edzésnapok és elérhetőség */}
        <Card variant="surface" radius="20" className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-15 font-bold text-text-primary">Edzésnapok és elérhetőség</h3>
                <p className="text-12 text-text-secondary">Heti edzésnapok ütemezése, alvási alapérték és nyugalmi pulzus</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenSection("trainingDays")}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Szerkesztés
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline space-y-3">
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block mb-1">
                Tervezett edzésnapok ({user?.trainingDays?.length ?? 0} nap / hét):
              </span>
              <div className="flex gap-1.5">
                {[
                  { d: 1, label: "H" },
                  { d: 2, label: "K" },
                  { d: 3, label: "Sz" },
                  { d: 4, label: "Cs" },
                  { d: 5, label: "P" },
                  { d: 6, label: "Sz" },
                  { d: 7, label: "V" }
                ].map(({ d, label }) => {
                  const isSelected = (user?.trainingDays || []).includes(d);
                  return (
                    <span
                      key={d}
                      className={`h-8 w-8 rounded-8 flex items-center justify-center font-mono font-bold text-12 ${
                        isSelected
                          ? "bg-brand text-white"
                          : "bg-bg-elevated text-text-tertiary border border-border-hairline"
                      }`}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-13 pt-1">
              <div>
                <span className="text-11 text-text-tertiary uppercase font-semibold block">Alvás cél</span>
                <span className="font-mono font-medium text-text-primary">{user?.sleepHoursBaseline || 8} óra / éj</span>
              </div>
              <div>
                <span className="text-11 text-text-tertiary uppercase font-semibold block">Nyugalmi HR</span>
                <span className="font-mono font-medium text-text-primary">{user?.restingHeartRateBaseline || 48} bpm</span>
              </div>
              <div>
                <span className="text-11 text-text-tertiary uppercase font-semibold block">Sérülések</span>
                <span className="font-medium text-text-secondary truncate block">{user?.currentInjuries || "Nincs"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 4. Célok és versenyek */}
        <Card variant="surface" radius="20" className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-15 font-bold text-text-primary">Célok és versenyek</h3>
                <p className="text-12 text-text-secondary">Fő célverseny, kitűzött időeredmény és céldátum</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenSection("goals")}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Szerkesztés
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline grid grid-cols-1 sm:grid-cols-3 gap-3 text-13">
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Célverseny</span>
              <span className="font-medium text-text-primary">{user?.targetCompetition || "Nincs kitűzve"}</span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Dátum</span>
              <span className="font-medium text-text-primary font-mono">{user?.targetCompetitionDate || "—"}</span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Célkitűzés</span>
              <span className="font-medium text-text-primary">{user?.goals || "—"}</span>
            </div>
          </div>
        </Card>

        {/* 5. Étrend alapok */}
        <Card variant="surface" radius="20" className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-15 font-bold text-text-primary">Étrend alapok</h3>
                <p className="text-12 text-text-secondary">Táplálkozási fókusz, tányérmodell vagy makró nézet</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenSection("nutrition")}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Szerkesztés
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline grid grid-cols-1 sm:grid-cols-2 gap-3 text-13">
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Táplálkozási fókusz</span>
              <span className="font-medium text-text-primary">
                {user?.nutritionGoal === "performance"
                  ? "Teljesítmény és glikogén feltöltés"
                  : user?.nutritionGoal === "lose"
                    ? "Fokozatos szálkásítás és zsírvesztés"
                    : user?.nutritionGoal === "gain"
                      ? "Izomépítés és tömegnövelés"
                      : "Egyensúlyi fenntartás"}
              </span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Nézet stílusa</span>
              <span className="font-medium text-text-primary">
                {user?.plateBasedViewOnly
                  ? "Egyszerű tányérmodell nézet"
                  : "Részletes makrotápanyagok (Fehérje, Szénhidrát, Zsír)"}
              </span>
            </div>
          </div>
        </Card>

        {/* 6. Adatforrás és támogatás */}
        <Card variant="surface" radius="20" className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-15 font-bold text-text-primary">Adatforrás és támogatás</h3>
                <p className="text-12 text-text-secondary">Okoseszköz integráció, edzői és szakemberi hozzáférések</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenSection("support")}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Szerkesztés
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline grid grid-cols-1 sm:grid-cols-2 gap-3 text-13">
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Adatforrás mód</span>
              <span className="font-medium text-text-primary">
                {user?.dataMode === "device"
                  ? "Automatikus okoseszköz szinkronizáció"
                  : user?.dataMode === "manual"
                    ? "Kézi rögzítés és naplózás"
                    : "Hibrid (eszköz + kézi kiegészítés)"}
              </span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Támogatás formája</span>
              <span className="font-medium text-text-primary">
                {user?.supportMode?.includes("coach")
                  ? "Edzői vezetés"
                  : user?.supportMode?.includes("specialist")
                    ? "Szakemberi kísérés"
                    : "Egyéni (Solo) felkészülés"}
              </span>
            </div>
          </div>
        </Card>

        {/* 7. Nyelv és mértékegység */}
        <Card variant="surface" radius="20" className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-15 font-bold text-text-primary">Nyelv és mértékegység</h3>
                <p className="text-12 text-text-secondary">Alkalmazás nyelve és mértékegység-rendszer</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenSection("locale")}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Szerkesztés
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-border-hairline grid grid-cols-2 gap-3 text-13">
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Nyelv</span>
              <span className="font-medium text-text-primary">
                {user?.locale === "en" ? "English" : "Magyar"}
              </span>
            </div>
            <div>
              <span className="text-11 text-text-tertiary uppercase font-semibold block">Mértékegység</span>
              <span className="font-medium text-text-primary">
                {user?.units === "imperial" ? "Angolszász (Imperial)" : "Metrikus (Metric)"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* MODAL 1: Basic Info */}
      <BottomSheet
        isOpen={activeSection === "basic"}
        onClose={handleRequestClose}
        title="Alapadatok szerkesztése"
      >
        <div className="space-y-4">
          <Input
            label="Teljes név"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <Input
            type="date"
            label="Születési dátum"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          <div className="space-y-1.5">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Biológiai nem
            </span>
            <SegmentedControl
              options={[
                { value: "male", label: "Férfi" },
                { value: "female", label: "Nő" },
                { value: "prefer_not_to_say", label: "Nem kívánom megadni" }
              ]}
              value={sex}
              onChange={(val) => setSex(val as "male" | "female" | "prefer_not_to_say")}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Magasság"
              unit="cm"
              min={120}
              max={230}
              value={heightCm}
              onChange={setHeightCm}
            />

            <NumberInput
              label="Testsúly"
              unit="kg"
              min={35}
              max={160}
              step={0.5}
              value={weightKg}
              onChange={setWeightKg}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-hairline">
            <Button variant="secondary" onClick={handleRequestClose}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSaveSection} isLoading={isSaving}>
              Mentés
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL 2: Sports */}
      <BottomSheet
        isOpen={activeSection === "sports"}
        onClose={handleRequestClose}
        title="Sportágak és versenyszint"
      >
        <div className="space-y-5">
          <SportSelector
            selectedSports={sports}
            onSportsChange={setSports}
            mainSport={mainSport}
            onMainSportChange={setMainSport}
            userId={user?.uid}
            label="Sportágak kiválasztása"
          />

          <div className="space-y-2">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Versenyszint
            </span>
            <SegmentedControl
              options={[
                { value: "hobby", label: "Hobby" },
                { value: "competitive_amateur", label: "Amatőr versenyző" },
                { value: "national", label: "Országos" },
                { value: "national_team", label: "Válogatott" },
                { value: "olympic", label: "Olimpiai keret" }
              ]}
              value={level}
              onChange={(val) => setLevel(val as AthleteLevel)}
              fullWidth
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-hairline">
            <Button variant="secondary" onClick={handleRequestClose}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSaveSection} isLoading={isSaving}>
              Mentés
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL 3: Training Days */}
      <BottomSheet
        isOpen={activeSection === "trainingDays"}
        onClose={handleRequestClose}
        title="Edzésnapok és elérhetőség"
      >
        <div className="space-y-5">
          <WeekdayPicker
            value={trainingDays}
            onChange={setTrainingDays}
            label="Heti tervezett edzésnapok"
            hint="Válaszd ki azokat a napokat, amikor edzeni tervezel"
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center text-13">
              <span className="font-medium text-text-primary">Alapértelmezett alvásigény</span>
              <span className="font-mono font-bold text-brand">{sleepHoursBaseline} óra</span>
            </div>
            <Slider
              min={4}
              max={12}
              step={0.5}
              value={sleepHoursBaseline}
              onChange={setSleepHoursBaseline}
            />
          </div>

          <NumberInput
            label="Nyugalmi pulzus (RHR)"
            unit="bpm"
            min={30}
            max={120}
            value={restingHr}
            onChange={setRestingHr}
          />

          <Input
            label="Aktív sérülések vagy korlátozások"
            placeholder="pl. Enyhe achilles érzékenység..."
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border-hairline">
            <Button variant="secondary" onClick={handleRequestClose}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSaveSection} isLoading={isSaving}>
              Mentés
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL 4: Goals */}
      <BottomSheet
        isOpen={activeSection === "goals"}
        onClose={handleRequestClose}
        title="Célok és versenyek"
      >
        <div className="space-y-4">
          <Input
            label="Célverseny megnevezése"
            placeholder="pl. Budapest Félmaraton / Ironman Klagenfurt"
            value={targetCompetition}
            onChange={(e) => setTargetCompetition(e.target.value)}
          />

          <Input
            type="date"
            label="Verseny dátuma"
            value={targetCompetitionDate}
            onChange={(e) => setTargetCompetitionDate(e.target.value)}
          />

          <Input
            label="Kitűzött cél vagy célidő"
            placeholder="pl. 1:29:00 félmaraton / Zóna 2-ben befejezni"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border-hairline">
            <Button variant="secondary" onClick={handleRequestClose}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSaveSection} isLoading={isSaving}>
              Mentés
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL 5: Nutrition */}
      <BottomSheet
        isOpen={activeSection === "nutrition"}
        onClose={handleRequestClose}
        title="Étrend alapok szerkesztése"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Táplálkozási fókusz
            </span>
            <SegmentedControl
              options={[
                { value: "performance", label: "Teljesítmény" },
                { value: "maintain", label: "Fenntartás" },
                { value: "lose", label: "Szálkásítás" },
                { value: "gain", label: "Tömegnövelés" }
              ]}
              value={nutritionGoal}
              onChange={(val) => setNutritionGoal(val as NutritionGoal)}
              fullWidth
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-16 border border-border-hairline bg-bg-surface">
            <div>
              <span className="text-14 font-semibold text-text-primary block">
                Egyszerű tányérmodell nézet
              </span>
              <span className="text-12 text-text-secondary">
                Részletes gramm-számítás helyett vizuális tányér arányok megjelenítése
              </span>
            </div>
            <Toggle
              checked={plateBasedViewOnly}
              onChange={setPlateBasedViewOnly}
            />
          </div>

          <div className="space-y-2">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Étrendi preferenciák
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Mindenevő",
                "Magas fehérjetartalmú",
                "Mediterrán",
                "Vegetáriánus",
                "Vegán",
                "Ketogén",
                "Alacsony FODMAP"
              ].map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={dietaryPreferences.includes(tag)}
                  onClick={() => toggleDietaryPref(tag)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Allergiák és intoleranciák
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Glutén",
                "Laktóz",
                "Tejfehérje",
                "Tojás",
                "Szója",
                "Diófélék",
                "Mogyoró",
                "Rákfélék"
              ].map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={allergiesIntolerances.includes(tag)}
                  onClick={() => toggleAllergy(tag)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-hairline">
            <Button variant="secondary" onClick={handleRequestClose}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSaveSection} isLoading={isSaving}>
              Mentés
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL 6: Support */}
      <BottomSheet
        isOpen={activeSection === "support"}
        onClose={handleRequestClose}
        title="Adatforrás és stáb támogatás"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Adatforrás Mód
            </span>
            <SegmentedControl
              options={[
                { value: "device", label: "Okoseszköz" },
                { value: "manual", label: "Manuális" },
                { value: "hybrid", label: "Hibrid" }
              ]}
              value={dataMode}
              onChange={(val) => setDataMode(val as DataMode)}
              fullWidth
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Támogatás formája
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "solo", label: "Egyéni (Solo)" },
                { id: "coach", label: "Edzői vezetés" },
                { id: "specialist", label: "Szakemberi kísérés" }
              ].map(({ id, label }) => {
                const selected = supportMode.includes(id as SupportMode);
                return (
                  <Chip
                    key={id}
                    label={label}
                    selected={selected}
                    onClick={() => {
                      const updated = selected
                        ? supportMode.length > 1
                          ? supportMode.filter((m) => m !== id)
                          : supportMode
                        : [...supportMode, id as SupportMode];
                      setSupportMode(updated);
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-hairline">
            <Button variant="secondary" onClick={handleRequestClose}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSaveSection} isLoading={isSaving}>
              Mentés
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL 7: Locale & Units */}
      <BottomSheet
        isOpen={activeSection === "locale"}
        onClose={handleRequestClose}
        title="Nyelv és mértékegység"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Nyelv (Language)
            </span>
            <SegmentedControl
              options={[
                { value: "hu", label: "Magyar" },
                { value: "en", label: "English" }
              ]}
              value={locale}
              onChange={(val) => setLocale(val as "hu" | "en")}
              fullWidth
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-12 font-medium uppercase tracking-wider text-text-secondary">
              Mértékegység
            </span>
            <SegmentedControl
              options={[
                { value: "metric", label: "Metrikus (km, kg, cm, °C)" },
                { value: "imperial", label: "Angolszász (mi, lb, ft, °F)" }
              ]}
              value={units}
              onChange={(val) => setUnits(val as UnitSystem)}
              fullWidth
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-hairline">
            <Button variant="secondary" onClick={handleRequestClose}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSaveSection} isLoading={isSaving}>
              Mentés
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default ProfilePage;
