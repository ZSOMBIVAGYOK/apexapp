import React, { useState } from "react";
import {
  Button,
  IconButton,
  Card,
  StatTile,
  ProgressRing,
  SegmentedControl,
  Tabs,
  BottomSheet,
  Input,
  NumberInput,
  Slider,
  Stepper,
  Select,
  Toggle,
  Chip,
  Avatar,
  Badge,
  Skeleton,
  EmptyState,
  ListRow,
  SectionHeader,
  ChartFrame,
  WeekStrip,
  SourceBadge,
  ConfidenceMeter,
  showToast
} from "@shared/ui";
import { useThemeStore } from "@shared/lib/theme/themeStore";
import {
  Flame,
  Activity,
  Dumbbell,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Play,
  Share2,
  Calendar,
  Sparkles,
  Droplets
} from "lucide-react";

export const DesignSystemPage: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  // Interactive component states for live testing
  const [readinessVal, setReadinessVal] = useState(88);
  const [segmentedVal, setSegmentedVal] = useState("7d");
  const [activeTab, setActiveTab] = useState("components");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [textInput, setTextInput] = useState("Olimpiai felkészülés");
  const [numberVal, setNumberVal] = useState(72.5);
  const [sliderVal, setSliderVal] = useState(8);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectVal, setSelectVal] = useState("triathlon");
  const [toggleVal, setToggleVal] = useState(true);
  const [chips, setChips] = useState([
    { id: "1", label: "Úszás (Z2)", selected: true },
    { id: "2", label: "Laktát küszöb", selected: false },
    { id: "3", label: "Erőfejlesztés", selected: true }
  ]);
  const [selectedDate, setSelectedDate] = useState("2026-10-26");
  const [chartRange, setChartRange] = useState("7D");
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isChartEmpty, setIsChartEmpty] = useState(false);

  const sampleDays = [
    { date: "2026-10-26", dayNumber: 26, dayName: "H", isToday: true, readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-27", dayNumber: 27, dayName: "K", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-28", dayNumber: 28, dayName: "Sze", readinessStatus: "caution" as const, hasWorkout: false },
    { date: "2026-10-29", dayNumber: 29, dayName: "Cs", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-10-30", dayNumber: 30, dayName: "P", readinessStatus: "rest" as const, hasWorkout: false },
    { date: "2026-10-31", dayNumber: 31, dayName: "Szo", readinessStatus: "ready" as const, hasWorkout: true },
    { date: "2026-11-01", dayNumber: 1, dayName: "V", readinessStatus: "ready" as const, hasWorkout: false }
  ];

  return (
    <div className="space-y-10 pb-16 max-w-[1200px] mx-auto">
      {/* Header & Theme Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-28 border border-border-hairline bg-bg-surface shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20">
              Dev Only • Styleguide
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
              Apex Cockpit Design System
            </span>
          </div>
          <h1 className="text-28 sm:text-40 font-bold tracking-tight text-text-primary mt-1">
            Design Tokens & Components
          </h1>
          <p className="text-14 text-text-secondary mt-1">
            Apple-level cleanliness, quiet chrome, high contrast, and data-first metrics.
          </p>
        </div>

        {/* Live Theme Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-12 bg-bg-elevated border border-border-hairline">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-semibold transition-all ${
              theme === "dark"
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-semibold transition-all ${
              theme === "light"
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-semibold transition-all ${
              theme === "system"
                ? "bg-brand text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Rendszer</span>
          </button>
        </div>
      </div>

      {/* Main Tabs: Tokens / Components / States */}
      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        variant="pill"
        tabs={[
          { id: "components", label: "Komponens Tárház (26)", icon: <Sparkles className="h-4 w-4" /> },
          { id: "tokens", label: "Design Tokenek & Tipográfia", icon: <Flame className="h-4 w-4" /> },
          { id: "states", label: "Képernyő Állapotok (Loading/Empty/Error)", icon: <Activity className="h-4 w-4" /> }
        ]}
      />

      {/* Tab 1: Components Showcase */}
      {activeTab === "components" && (
        <div className="space-y-12">
          {/* 1. Cockpit Metrics & Readiness Rings */}
          <section className="space-y-4">
            <SectionHeader
              title="1. Cockpit Mutatók & ProgressRing"
              description="Nagy számok (weight 600, tight letter-spacing, tabular numerals), szemantikus státusz gyűrű"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="surface" className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                <ProgressRing
                  value={readinessVal}
                  label="Regeneráció"
                  subtext="Kiváló terhelhetőség"
                  size={150}
                />
                <div className="w-full max-w-xs space-y-1">
                  <span className="text-12 text-text-secondary">Próbáld ki a csúszkát:</span>
                  <Slider
                    value={readinessVal}
                    min={20}
                    max={100}
                    onChange={setReadinessVal}
                    statusColor={readinessVal >= 80 ? "ready" : readinessVal >= 60 ? "caution" : "rest"}
                  />
                </div>
              </Card>

              <div className="space-y-4 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatTile
                  label="HRV (rMSSD)"
                  value={88}
                  unit="ms"
                  status="ready"
                  trend={{ direction: "up", value: "+14%", isGood: true }}
                  subtext="Elmúlt 7 nap átlaga: 81 ms"
                  topRight={<SourceBadge source="WHOOP" />}
                />
                <StatTile
                  label="Nyugalmi pulzus"
                  value={46}
                  unit="bpm"
                  status="ready"
                  trend={{ direction: "down", value: "-2 bpm", isGood: true }}
                  subtext="Paraszimpatikus adaptáció"
                  topRight={<SourceBadge source="Garmin" />}
                />
                <StatTile
                  label="Alvásidő"
                  value="8.2"
                  unit="óra"
                  status="ready"
                  trend={{ direction: "neutral", value: "Cél: 8h" }}
                  subtext="1h 45m mélyalvás (21%)"
                  topRight={<ConfidenceMeter level="high" score={98} />}
                />
                <StatTile
                  label="Akut terhelés (ACWR)"
                  value="1.18"
                  status="caution"
                  trend={{ direction: "up", value: "Optimális (0.8 - 1.3)", isGood: true }}
                  subtext="Sérüléskockázat: Alacsony"
                  topRight={<SourceBadge source="Manual" />}
                />
              </div>
            </div>
          </section>

          {/* 2. Interactive Buttons & IconButtons */}
          <section className="space-y-4">
            <SectionHeader
              title="2. Gombok & Ikon Gombok"
              description="Nyugodt króm, 200ms ease-out átmenet, aktív lépték visszajelzés"
            />
            <Card variant="surface" className="p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" leftIcon={<Play className="h-4 w-4" />}>
                  Edzés indítása
                </Button>
                <Button variant="secondary" leftIcon={<CheckCircle2 className="h-4 w-4 text-status-ready" />}>
                  Elmentve
                </Button>
                <Button variant="tertiary">
                  Harmadlagos opció
                </Button>
                <Button variant="ghost">
                  Ghost gomb
                </Button>
                <Button variant="danger">
                  Törlés / Visszavonás
                </Button>
                <Button variant="primary" isLoading>
                  Betöltés...
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border-hairline">
                <IconButton aria-label="Hozzáadás" variant="surface" icon={<Plus className="h-4 w-4" />} />
                <IconButton aria-label="Megosztás" variant="brand" icon={<Share2 className="h-4 w-4" />} />
                <IconButton aria-label="Esemény naptár" variant="ghost" icon={<Calendar className="h-4 w-4" />} />
                <IconButton aria-label="Figyelmeztetés" variant="danger" icon={<AlertTriangle className="h-4 w-4" />} />
                <IconButton aria-label="Betöltés" variant="surface" isLoading icon={<Plus className="h-4 w-4" />} />
              </div>
            </Card>
          </section>

          {/* 3. SegmentedControl & Tabs */}
          <section className="space-y-4">
            <SectionHeader
              title="3. SegmentedControl & Lapok"
              description="Apple stílusú szegmensválasztó billentyűzet-navigációval és WAI-ARIA tabpanelek"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="surface" className="p-6 space-y-4">
                <span className="text-12 font-medium uppercase tracking-wider text-text-secondary">
                  Időtáv szegmensválasztó:
                </span>
                <SegmentedControl
                  options={[
                    { value: "24h", label: "24 óra" },
                    { value: "7d", label: "7 nap", badge: "Új" },
                    { value: "28d", label: "28 nap" },
                    { value: "ytd", label: "YTD" }
                  ]}
                  value={segmentedVal}
                  onChange={setSegmentedVal}
                  fullWidth
                />
                <p className="text-12 text-text-secondary">
                  Kiválasztott szegmens: <span className="font-semibold text-text-primary">{segmentedVal}</span>
                </p>
              </Card>

              <Card variant="surface" className="p-6 space-y-4">
                <span className="text-12 font-medium uppercase tracking-wider text-text-secondary">
                  Modal & BottomSheet Triggerek:
                </span>
                <div>
                  <Button variant="secondary" onClick={() => setIsSheetOpen(true)}>
                    BottomSheet Megnyitása (Mobilon fiók, Desktopon modal)
                  </Button>
                </div>
                <p className="text-12 text-text-secondary">
                  Próbáld ki a reszponzivitást! Desktopon elegáns középre igazított párbeszédablakká alakul.
                </p>
              </Card>
            </div>
          </section>

          {/* 4. Form Primitives: Input, NumberInput, Slider, Stepper, Select, Toggle, Chip */}
          <section className="space-y-4">
            <SectionHeader
              title="4. Form Vezérlők & Csúszkák"
              description="Input, NumberInput léptetővel, címkézett Slider lépésekkel, Stepper, Select és iOS Toggle"
            />
            <Card variant="surface" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Sportolói jegyzet"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onClear={() => setTextInput("")}
                  hint="Nyugodt, nagy kontrasztú beviteli mező"
                />

                <NumberInput
                  label="Testsúly (kg)"
                  value={numberVal}
                  onChange={setNumberVal}
                  min={40}
                  max={150}
                  step={0.5}
                  unit="kg"
                  hint="Billentyűzet fel/le nyilakkal is léptethető"
                />

                <Select
                  label="Választott Sportág"
                  options={[
                    { value: "triathlon", label: "Triatlon (Olimpiai)" },
                    { value: "swimming", label: "Gyorsúszás (100m, 200m)" },
                    { value: "rowing", label: "Evezés (Kétpárevezős)" },
                    { value: "athletics", label: "Középtávfutás" }
                  ]}
                  value={selectVal}
                  onChange={setSelectVal}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-hairline">
                <Slider
                  label="Izomláz / Fájdalom szintje (RPE)"
                  value={sliderVal}
                  onChange={setSliderVal}
                  min={1}
                  max={10}
                  unit="/ 10"
                  statusColor={sliderVal >= 8 ? "rest" : sliderVal >= 5 ? "caution" : "ready"}
                  steps={[
                    { value: 1, label: "1 Pihent" },
                    { value: 3, label: "3" },
                    { value: 5, label: "5 Átlagos" },
                    { value: 7, label: "7" },
                    { value: 10, label: "10 Max" }
                  ]}
                />

                <div className="flex flex-col justify-between">
                  <Toggle
                    label="Biometrikus eszközök automatikus szinkronizációja"
                    description="Háttérben szinkronizálja a Garmin Connect és WHOOP adatokat"
                    checked={toggleVal}
                    onChange={setToggleVal}
                  />
                </div>
              </div>

              {/* Stepper & Chips */}
              <div className="pt-4 border-t border-border-hairline space-y-4">
                <span className="text-12 font-medium uppercase tracking-wider text-text-secondary block">
                  Onboarding & Munkafolyamat Léptető (Stepper):
                </span>
                <Stepper
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                  steps={[
                    { id: "1", label: "Alapadatok" },
                    { id: "2", label: "Sportág & Szint" },
                    { id: "3", label: "Stáb meghívása" },
                    { id: "4", label: "Kész" }
                  ]}
                />

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-12 text-text-secondary mr-2">Edzés címkék (Chips):</span>
                  {chips.map((chip) => (
                    <Chip
                      key={chip.id}
                      selected={chip.selected}
                      onClick={() =>
                        setChips(
                          chips.map((c) => (c.id === chip.id ? { ...c, selected: !c.selected } : c))
                        )
                      }
                      onRemove={() => setChips(chips.filter((c) => c.id !== chip.id))}
                    >
                      {chip.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {/* 5. ListRow, Badges, SourceBadges, ConfidenceMeter */}
          <section className="space-y-4">
            <SectionHeader
              title="5. Adatsorok (ListRow) & Jelvények (Badges)"
              description="Cockpit adatsorok, micro-badge források és megbízhatósági szintmérők"
            />
            <Card variant="surface" padding="none" className="overflow-hidden">
              <ListRow
                leading={<Avatar name="Kovács Zsombor" size="md" status="ready" />}
                title="Kovács Zsombor (Olimpiai kerettag)"
                subtitle="Fő sportág: Triatlon • Napi terhelés: 124 TSS"
                trailing={<Badge variant="ready" dot>Készen áll</Badge>}
                showChevron
                divider
                onClick={() =>
                  showToast({ title: "Sportoló kiválasztva", message: "Profil részletek betöltve", type: "info" })
                }
              />
              <ListRow
                leading={<Dumbbell className="h-5 w-5 text-brand" />}
                title="5x400m Laktát-küszöb sorozat (Úszás)"
                subtitle="10:00 - 11:30 • RPE 8.5 • 90 perc"
                value="120 TSS"
                trailing={<SourceBadge source="Garmin" />}
                showChevron
                divider
                onClick={() =>
                  showToast({ title: "Edzés megnyitva", message: "Részidők és pulzusgörbe", type: "info" })
                }
              />
              <ListRow
                leading={<Droplets className="h-5 w-5 text-cyan-400" />}
                title="Napi Folyadékbevitel"
                subtitle="Cél: 3.5 liter • Nátrium pótlás aktív"
                value="2.75 / 3.5 l"
                trailing={<ConfidenceMeter level="high" score={95} />}
                divider
              />
            </Card>
          </section>

          {/* 6. Calendar Primitives (WeekStrip) & ChartFrame */}
          <section className="space-y-4">
            <SectionHeader
              title="6. Naptár Primitívek & ChartFrame"
              description="Heti edzés sáv (WeekStrip) és rugalmas diagram keret állapotkezeléssel"
            />
            <WeekStrip
              days={sampleDays}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                showToast({ title: "Nap kiválasztva", message: `${d} edzésterve aktív`, type: "info" });
              }}
              title="2026. Október — 44. Hét (Heti tervező)"
            />

            <ChartFrame
              title="Akut vs. Krónikus Terhelés (ACWR)"
              subtitle="7 napos akut terhelési átlag a 28 napos krónikus bázishoz viszonyítva"
              timeRanges={["7D", "14D", "28D", "YTD"]}
              selectedRange={chartRange}
              onRangeChange={setChartRange}
              isLoading={isChartLoading}
              isEmpty={isChartEmpty}
              legend={
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="h-2 w-2 rounded-full bg-status-ready" /> Akut
                  </span>
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span className="h-2 w-2 rounded-full bg-brand" /> Krónikus
                  </span>
                </div>
              }
            >
              <div className="h-44 w-full flex items-center justify-center text-text-secondary border border-dashed border-border-subtle rounded-12">
                [Recharts interaktív terhelési diagram ezen a vásznon]
              </div>
            </ChartFrame>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChartLoading(!isChartLoading)}
              >
                {isChartLoading ? "Betöltés kikapcsolása" : "Chart Betöltési állapot (Skeleton)"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChartEmpty(!isChartEmpty)}
              >
                {isChartEmpty ? "Üres állapot kikapcsolása" : "Chart Üres állapot (EmptyState)"}
              </Button>
            </div>
          </section>

          {/* 7. Toasts System Trigger */}
          <section className="space-y-4">
            <SectionHeader
              title="7. Toast Értesítési Rendszer"
              description="Automatikus elhalványulás, kézi bezárás, WAI-ARIA live region"
            />
            <Card variant="surface" className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  leftIcon={<CheckCircle2 className="h-4 w-4 text-status-ready" />}
                  onClick={() =>
                    showToast({
                      title: "Sikeres mentés",
                      message: "A reggeli check-in adatai rögzítve a Firestore-ban.",
                      type: "success"
                    })
                  }
                >
                  Success Toast
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<AlertTriangle className="h-4 w-4 text-status-caution" />}
                  onClick={() =>
                    showToast({
                      title: "Megnövekedett terhelési arány",
                      message: "Az ACWR elérte az 1.45-ös értéket. Javasolt a mai volumen csökkentése.",
                      type: "warning"
                    })
                  }
                >
                  Warning Toast
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<AlertCircle className="h-4 w-4 text-status-rest" />}
                  onClick={() =>
                    showToast({
                      title: "Szinkronizációs hiba",
                      message: "A Garmin Connect API átmenetileg nem elérhető. Próbáld később.",
                      type: "error"
                    })
                  }
                >
                  Error Toast
                </Button>
              </div>
            </Card>
          </section>
        </div>
      )}

      {/* Tab 2: Design Tokens & Typography Scale */}
      {activeTab === "tokens" && (
        <div className="space-y-8">
          <Card variant="surface" className="p-6 space-y-6">
            <h3 className="text-20 font-bold tracking-tight text-text-primary">
              Szín Tokenek (Aktív Téma: {resolvedTheme})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-16 bg-bg-primary border border-border-hairline">
                <div className="h-10 w-full rounded-12 bg-bg-primary border border-border-hairline mb-2" />
                <p className="text-12 font-bold text-text-primary">bg-primary</p>
                <p className="text-12 text-text-secondary font-mono">
                  {resolvedTheme === "dark" ? "#0B0C0F" : "#F5F6F8"}
                </p>
              </div>
              <div className="p-4 rounded-16 bg-bg-surface border border-border-hairline">
                <div className="h-10 w-full rounded-12 bg-bg-surface border border-border-hairline mb-2" />
                <p className="text-12 font-bold text-text-primary">bg-surface</p>
                <p className="text-12 text-text-secondary font-mono">
                  {resolvedTheme === "dark" ? "#14161B" : "#FFFFFF"}
                </p>
              </div>
              <div className="p-4 rounded-16 bg-bg-elevated border border-border-hairline">
                <div className="h-10 w-full rounded-12 bg-bg-elevated border border-border-hairline mb-2" />
                <p className="text-12 font-bold text-text-primary">bg-elevated</p>
                <p className="text-12 text-text-secondary font-mono">
                  {resolvedTheme === "dark" ? "#1C1F26" : "#FFFFFF"}
                </p>
              </div>
              <div className="p-4 rounded-16 bg-bg-surface border border-border-hairline">
                <div className="h-10 w-full rounded-12 bg-brand mb-2" />
                <p className="text-12 font-bold text-text-primary">brand (accent)</p>
                <p className="text-12 text-text-secondary font-mono">#3D7BFF</p>
              </div>
            </div>

            <h4 className="text-16 font-bold text-text-primary pt-4 border-t border-border-hairline">
              Szemantikus Státusz Színek (KIZÁRÓLAG regenerációra, terhelésre és riasztásokra)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-16 bg-status-ready/10 border border-status-ready/30">
                <div className="h-8 w-full rounded-8 bg-status-ready mb-2" />
                <p className="text-12 font-bold text-status-ready">ready / green (#34D399)</p>
                <p className="text-12 text-text-secondary">Optimális regeneráció, adaptációra kész</p>
              </div>
              <div className="p-4 rounded-16 bg-status-caution/10 border border-status-caution/30">
                <div className="h-8 w-full rounded-8 bg-status-caution mb-2" />
                <p className="text-12 font-bold text-status-caution">caution / amber (#FBBF24)</p>
                <p className="text-12 text-text-secondary">Fokozott fáradtság, megfigyelendő terhelés</p>
              </div>
              <div className="p-4 rounded-16 bg-status-rest/10 border border-status-rest/30">
                <div className="h-8 w-full rounded-8 bg-status-rest mb-2" />
                <p className="text-12 font-bold text-status-rest">rest / red (#F87171)</p>
                <p className="text-12 text-text-secondary">Pihenőnap vagy aktív regeneráció szükséges</p>
              </div>
            </div>
          </Card>

          {/* Typography Scale */}
          <Card variant="surface" className="p-6 space-y-4">
            <h3 className="text-20 font-bold tracking-tight text-text-primary">
              Tipográfiai Skála (12 / 14 / 16 / 20 / 28 / 40 / 64)
            </h3>
            <div className="space-y-4 divide-y divide-border-hairline">
              <div className="pt-2 flex items-baseline justify-between gap-4">
                <span className="text-12 text-text-secondary font-mono w-24">12px / 16px</span>
                <span className="text-12 text-text-primary flex-1">
                  12px: Micro címkék, láblécek, státusz jelvények, adatsor feliratok.
                </span>
              </div>
              <div className="pt-2 flex items-baseline justify-between gap-4">
                <span className="text-12 text-text-secondary font-mono w-24">14px / 20px</span>
                <span className="text-14 text-text-primary flex-1">
                  14px: Alapértelmezett bekezdések, űrlap mezők, listaelemek, gombok.
                </span>
              </div>
              <div className="pt-2 flex items-baseline justify-between gap-4">
                <span className="text-12 text-text-secondary font-mono w-24">16px / 24px</span>
                <span className="text-16 font-semibold text-text-primary flex-1">
                  16px: Kártya címek, kiemelt feliratok, navigációs pontok.
                </span>
              </div>
              <div className="pt-2 flex items-baseline justify-between gap-4">
                <span className="text-12 text-text-secondary font-mono w-24">20px / 28px</span>
                <span className="text-20 font-bold tracking-tight text-text-primary flex-1">
                  20px: Szekció fejlécek, modális ablakok címei.
                </span>
              </div>
              <div className="pt-2 flex items-baseline justify-between gap-4">
                <span className="text-12 text-text-secondary font-mono w-24">28px / 36px</span>
                <span className="text-28 font-bold tracking-tight text-text-primary flex-1">
                  28px: Képernyő főcímek, közepes metrika számok (88 ms, 14.2 TSS).
                </span>
              </div>
              <div className="pt-2 flex items-baseline justify-between gap-4">
                <span className="text-12 text-text-secondary font-mono w-24">40px / 48px</span>
                <span className="text-40 font-semibold tracking-tight tabular-nums text-text-primary flex-1">
                  40px: Nagy cockpit mutatók (92 / 100, 3 450 kcal).
                </span>
              </div>
              <div className="pt-2 flex items-baseline justify-between gap-4">
                <span className="text-12 text-text-secondary font-mono w-24">64px / 72px</span>
                <span className="text-64 font-semibold tracking-tight tabular-nums text-text-primary flex-1">
                  64px: Kiemelt cockpit fókusz.
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Screen States (Loading / Empty / Error) */}
      {activeTab === "states" && (
        <div className="space-y-8">
          <SectionHeader
            title="Képernyő Állapotok Minőségi Követelményei"
            description="Minden felületnek rendelkeznie kell betöltési (Skeleton), üres (EmptyState) és hiba (ErrorState) reprezentációval."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Loading State */}
            <Card variant="surface" className="p-6 space-y-4">
              <span className="text-12 font-bold uppercase tracking-wider text-brand">
                1. Betöltési Állapot (Loading Skeleton)
              </span>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </div>
                </div>
                <Skeleton variant="rectangular" height={100} />
              </div>
            </Card>

            {/* Empty State */}
            <Card variant="surface" className="p-6 space-y-4">
              <span className="text-12 font-bold uppercase tracking-wider text-text-secondary">
                2. Üres Állapot (Empty State)
              </span>
              <EmptyState
                title="Nincs rögzített edzés"
                description="Mára még nincs ütemezett vagy manuálisan naplózott edzésblokk."
                action={<Button size="sm" variant="secondary">Edzés hozzáadása</Button>}
              />
            </Card>

            {/* Error State */}
            <Card variant="surface" className="p-6 space-y-4">
              <span className="text-12 font-bold uppercase tracking-wider text-status-rest">
                3. Hiba Állapot (Error State)
              </span>
              <div className="rounded-20 border border-status-rest/30 bg-status-rest/10 p-5 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-status-rest mx-auto" />
                <h4 className="text-14 font-bold text-text-primary">Kapcsolódási hiba</h4>
                <p className="text-12 text-text-secondary">
                  Nem sikerült letölteni a legfrissebb biometriát. Ellenőrizd a hálózati kapcsolatot.
                </p>
                <Button size="sm" variant="danger">Újrapróbálás</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* BottomSheet / Modal Demo */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Gyors Edzésnaplózás"
        description="Rögzítsd a befejezett tréninget, intenzitást és a valós RPE érzetet."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsSheetOpen(false)}>
              Mégse
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsSheetOpen(false);
                showToast({
                  title: "Edzés elmentve",
                  message: "A terhelési mutatók sikeresen frissültek a naptárban.",
                  type: "success"
                });
              }}
            >
              Naplózás mentése
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input label="Edzés címe" defaultValue="10x100m Gyorsúszás (A2 zóna)" />
          <NumberInput label="Időtartam (perc)" value={75} onChange={() => {}} min={15} max={240} unit="perc" />
          <Slider label="Érzékelt Terhelés (RPE 1-10)" value={8} onChange={() => {}} min={1} max={10} statusColor="caution" />
        </div>
      </BottomSheet>
    </div>
  );
};

export default DesignSystemPage;
