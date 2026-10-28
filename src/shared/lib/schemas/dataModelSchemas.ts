import { z } from "zod";

export const DataSourceOriginSchema = z.enum([
  "manual",
  "garmin",
  "whoop",
  "file",
  "apple_health",
  "polar",
  "other"
]);

export const StandardRecordMetadataSchema = z.object({
  source: DataSourceOriginSchema,
  confidence: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().min(1)
});

export const SharingModuleSchema = z.enum([
  "training",
  "recovery",
  "nutrition",
  "health",
  "devices",
  "messages"
]);

export const PermissionLevelSchema = z.enum(["none", "read", "write"]);

export const ModulePermissionsSchema = z.object({
  training: PermissionLevelSchema,
  recovery: PermissionLevelSchema,
  nutrition: PermissionLevelSchema,
  health: PermissionLevelSchema,
  devices: PermissionLevelSchema,
  messages: PermissionLevelSchema
});

export const MemberRoleSchema = z.enum(["coach", "specialist"]);

export const MemberSpecialtySchema = z.enum([
  "nutrition",
  "physio",
  "strength",
  "psychology",
  "medical",
  "other"
]);

export const RelationshipStatusSchema = z.enum(["pending", "active", "revoked"]);

export const SharingRelationshipSchema = z.object({
  relId: z.string().min(1),
  athleteId: z.string().min(1),
  memberId: z.string().min(1),
  memberName: z.string().min(1),
  memberEmail: z.string().email(),
  memberRole: MemberRoleSchema,
  specialty: MemberSpecialtySchema,
  status: RelationshipStatusSchema,
  permissions: ModulePermissionsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().min(1)
});

export const RelationshipAuditLogEntrySchema = z.object({
  logId: z.string().min(1),
  relId: z.string().min(1),
  athleteId: z.string().min(1),
  performedBy: z.string().min(1),
  action: z.enum(["created", "permissions_updated", "revoked", "accepted"]),
  previousPermissions: ModulePermissionsSchema.partial().optional(),
  newPermissions: ModulePermissionsSchema.partial().optional(),
  previousStatus: RelationshipStatusSchema.optional(),
  newStatus: RelationshipStatusSchema.optional(),
  timestamp: z.string().datetime(),
  reason: z.string().optional()
});

export const SharingInviteSchema = z.object({
  code: z.string().min(4).max(12),
  athleteId: z.string().min(1),
  athleteName: z.string().min(1),
  athleteEmail: z.string().email(),
  inviteeEmail: z.string().email().optional(),
  memberRole: MemberRoleSchema,
  specialty: MemberSpecialtySchema,
  permissions: ModulePermissionsSchema,
  status: z.enum(["pending", "accepted", "expired"]),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime()
});

export const AthleteThresholdsSchema = z.object({
  maxHR: z.number().positive().optional(),
  lthr: z.number().positive().optional(),
  ftp: z.number().positive().optional(),
  thresholdPace: z.string().optional(),
  css: z.string().optional()
});

export const AthleteCompetitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  date: z.string(),
  priority: z.enum(["A", "B", "C"]),
  location: z.string().optional(),
  targetTime: z.string().optional(),
  notes: z.string().optional()
});

export const AthleteProfileDocumentSchema = StandardRecordMetadataSchema.extend({
  athleteId: z.string().min(1),
  sport: z.string().min(1),
  sports: z.array(z.string()),
  level: z.enum(["hobby", "competitive_amateur", "national", "national_team", "olympic"]),
  birthDate: z.string().optional(),
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  thresholds: AthleteThresholdsSchema,
  goals: z.string().optional(),
  competitions: z.array(AthleteCompetitionSchema)
});

export const ReadinessDriverSchema = z.object({
  id: z.string(),
  label: z.string(),
  impact: z.enum(["positive", "negative"]),
  category: z.enum(["sleep", "hrv", "rhr", "wellness", "load"])
});

export const DailyAggregateDocumentSchema = StandardRecordMetadataSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  athleteId: z.string().min(1),
  sleep: z.object({
    durationMinutes: z.number().min(0),
    qualityScore: z.number().min(1).max(10),
    bedTime: z.string().optional(),
    wakeTime: z.string().optional(),
    deepMinutes: z.number().optional(),
    remMinutes: z.number().optional(),
    awakeMinutes: z.number().optional()
  }),
  hrv: z
    .object({
      rmssd: z.number().min(0),
      score: z.number().min(0).max(100).optional(),
      status: z.enum(["low", "balanced", "high"]).optional()
    })
    .optional(),
  restingHeartRate: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  subjective: z.object({
    fatigue: z.number().min(1).max(10).optional(),
    soreness: z.number().min(1).max(10),
    stress: z.number().min(1).max(10),
    energy: z.number().min(1).max(10).optional(),
    mood: z.number().min(1).max(10).optional(),
    motivation: z.number().min(1).max(10).optional(),
    appetite: z.number().min(1).max(10).optional(),
    illness: z.boolean().optional(),
    soreAreas: z.array(z.string()).optional(),
    sleepQuality: z.number().min(1).max(10).optional()
  }),
  readinessScore: z.number().min(0).max(100),
  readinessStatus: z.enum(["ready", "caution", "rest"]),
  readinessConfidence: z.number().min(0).max(100).optional(),
  readinessDrivers: z.array(ReadinessDriverSchema).optional(),
  isCalibrating: z.boolean().optional(),
  calibrationDays: z.number().optional(),
  sourceFlags: z
    .object({
      sleepSource: DataSourceOriginSchema.optional(),
      hrvSource: DataSourceOriginSchema.optional(),
      rhrSource: DataSourceOriginSchema.optional(),
      wellnessSource: DataSourceOriginSchema.optional()
    })
    .optional(),
  notes: z.string().optional()
});

export const SessionTimeSeriesPointSchema = z.object({
  timeOffsetSeconds: z.number(),
  heartRate: z.number().optional(),
  powerWatts: z.number().optional(),
  speedMps: z.number().optional(),
  paceSecondsPerKm: z.number().optional(),
  elevationMeters: z.number().optional(),
  distanceMeters: z.number().optional(),
  lat: z.number().optional(),
  lon: z.number().optional()
});

export const CompletedSessionDocumentSchema = StandardRecordMetadataSchema.extend({
  sessionId: z.string().min(1),
  athleteId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sport: z.string().min(1),
  title: z.string().min(1),
  startTime: z.string(),
  durationMinutes: z.number().positive(),
  durationSeconds: z.number().optional(),
  rpe: z.number().min(1).max(10),
  targetIntensityRpe: z.number().min(1).max(10).optional(),
  trainingLoad: z.number().optional(),
  metrics: z
    .object({
      avgHeartRate: z.number().optional(),
      maxHeartRate: z.number().optional(),
      avgPower: z.number().optional(),
      avgPowerWatts: z.number().optional(),
      normalizedPower: z.number().optional(),
      distanceMeters: z.number().optional(),
      elevationGainMeters: z.number().optional(),
      avgPace: z.string().optional(),
      calories: z.number().optional()
    })
    .optional(),
  intervals: z
    .array(
      z.object({
        index: z.number(),
        type: z.enum(["work", "rest"]),
        durationSeconds: z.number(),
        targetIntensity: z.string().optional(),
        actualValue: z.string().optional()
      })
    )
    .optional(),
  coachFeedback: z.string().optional(),
  notes: z.string().optional(),
  equipmentIds: z.array(z.string()).optional(),
  courseId: z.string().optional(),
  fileRef: z.string().optional(),
  fileType: z.enum(["fit", "gpx", "tcx", "csv"]).optional(),
  fileName: z.string().optional(),
  fileSizeBytes: z.number().optional(),
  importedAt: z.string().optional(),
  timeSeries: z
    .object({
      points: z.array(SessionTimeSeriesPointSchema),
      svgRouteOutline: z.string().optional()
    })
    .optional(),
  completed: z.boolean()
});

export const PlannedWorkoutDocumentSchema = StandardRecordMetadataSchema.extend({
  workoutId: z.string().min(1),
  athleteId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sport: z.string().min(1),
  title: z.string().min(1),
  plannedDurationMinutes: z.number().positive(),
  targetRpe: z.number().min(1).max(10),
  structuredSteps: z.string().optional(),
  assignedBy: z.string().min(1),
  status: z.enum(["scheduled", "completed", "skipped"])
});

export const DailyNutritionDocumentSchema = StandardRecordMetadataSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  athleteId: z.string().min(1),
  targetCalories: z.number().nonnegative(),
  targetProteinGrams: z.number().nonnegative(),
  targetCarbsGrams: z.number().nonnegative(),
  targetFatGrams: z.number().nonnegative(),
  targetHydrationLiters: z.number().nonnegative(),
  consumedCalories: z.number().nonnegative(),
  consumedProteinGrams: z.number().nonnegative(),
  consumedCarbsGrams: z.number().nonnegative(),
  consumedFatGrams: z.number().nonnegative(),
  consumedHydrationLiters: z.number().nonnegative(),
  platePortions: z
    .object({
      proteinPct: z.number().min(0).max(100),
      vegPct: z.number().min(0).max(100),
      carbsPct: z.number().min(0).max(100)
    })
    .optional()
});

export const NutritionEntryDocumentSchema = StandardRecordMetadataSchema.extend({
  entryId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  athleteId: z.string().min(1),
  mealType: z.enum([
    "breakfast",
    "pre_workout",
    "post_workout",
    "lunch",
    "dinner",
    "snack",
    "hydration"
  ]),
  name: z.string().min(1),
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  waterMilliliters: z.number().nonnegative(),
  loggedAt: z.string().datetime()
});

export const InjuryDocumentSchema = StandardRecordMetadataSchema.extend({
  injuryId: z.string().min(1),
  athleteId: z.string().min(1),
  title: z.string().min(1),
  anatomicalLocation: z.string().min(1),
  side: z.enum(["left", "right", "bilateral", "axial"]).optional(),
  severity: z.enum(["mild", "moderate", "severe"]),
  onsetDate: z.string(),
  status: z.enum(["active", "rehab", "resolved"]),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  restrictions: z.array(z.string()).optional()
});

export const MeasurementDocumentSchema = StandardRecordMetadataSchema.extend({
  measurementId: z.string().min(1),
  athleteId: z.string().min(1),
  date: z.string(),
  type: z.enum(["body_composition", "lactate_test", "vo2_max", "blood_panel", "mobility_screen"]),
  values: z.record(z.union([z.number(), z.string()])),
  practitionerNotes: z.string().optional()
});

export const ConfidentialNoteDocumentSchema = StandardRecordMetadataSchema.extend({
  noteId: z.string().min(1),
  athleteId: z.string().min(1),
  category: z.enum(["medical", "physio", "psychology", "general"]),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  authorRole: z.enum(["athlete", "coach", "specialist"]),
  content: z.string().min(1),
  confidentiality: z.enum(["standard", "restricted"])
});

export const CustomSportDocumentSchema = z.object({
  id: z.string().min(1),
  nameHu: z.string().min(1),
  nameEn: z.string().optional(),
  category: z.enum([
    "endurance",
    "strength",
    "team",
    "combat",
    "racket",
    "water",
    "winter",
    "gymnastics",
    "other"
  ]),
  metricProfile: z.enum([
    "distance_duration",
    "duration_only",
    "sets_reps_load",
    "rounds_time",
    "points"
  ]),
  icon: z.string().optional(),
  createdAt: z.string().optional()
});

export const HydrationLogDocumentSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  timestamp: z.string(),
  timeStr: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  beverageId: z.string().min(1),
  beverageName: z.string().min(1),
  volumeMl: z.number().positive(),
  hydrationFactor: z.number().positive(),
  effectiveVolumeMl: z.number().positive(),
  caffeineMg: z.number().nonnegative().optional(),
  sugarGrams: z.number().nonnegative().optional(),
  sodiumMg: z.number().nonnegative().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  note: z.string().optional()
});

export const CustomBeverageDocumentSchema = z.object({
  id: z.string().min(1),
  nameHu: z.string().min(1),
  nameEn: z.string().optional(),
  hydrationFactor: z.number().positive(),
  caffeineMgPer100ml: z.number().nonnegative().optional(),
  sugarGramsPer100ml: z.number().nonnegative().optional(),
  sodiumMgPer100ml: z.number().nonnegative().optional(),
  icon: z.string().optional(),
  color: z.string().optional()
});

export const ExerciseDocumentSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  videoUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "A videó linknek biztonságos https:// URL-nek kell lennie."
    })
    .optional()
    .or(z.literal("")),
  defaultSetsRepsLoad: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  isFavorite: z.boolean().default(false),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const RecoveryCategorySchema = z.enum([
  "mobility_gymnastics",
  "cold",
  "heat",
  "contrast",
  "massage_therapy",
  "sleep_relaxation",
  "other"
]);

export const RecoveryActivityTypeSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().optional(),
  nameHu: z.string().min(1),
  nameEn: z.string().min(1),
  category: RecoveryCategorySchema,
  icon: z.string().min(1),
  showTemperature: z.boolean().optional(),
  showRounds: z.boolean().optional(),
  showBodyArea: z.boolean().optional(),
  showIntensity: z.boolean().optional(),
  defaultDurationMinutes: z.number().positive().optional(),
  isCustom: z.boolean().optional(),
  isFavorite: z.boolean().optional()
});

export const RecoveryActivityLogSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().min(1),
  activityTypeId: z.string().min(1),
  activityName: z.string().min(1),
  category: RecoveryCategorySchema,
  durationMinutes: z.number().positive(),
  temperatureCelsius: z.number().optional(),
  rounds: z.number().int().positive().optional(),
  bodyArea: z.string().optional(),
  intensity: z.enum(["low", "medium", "high"]).optional(),
  perceivedEffect: z.number().min(1).max(5),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().min(1)
});

export const RecordMetricTypeSchema = z.enum([
  "time_for_distance",
  "distance_in_time",
  "weight_reps_1rm",
  "max_reps",
  "max_duration",
  "points",
  "custom"
]);

export const AthleteRecordSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  sportId: z.string().min(1),
  sportName: z.string().min(1),
  discipline: z.string().min(1),
  recordType: RecordMetricTypeSchema,
  value: z.number().nonnegative(),
  displayValue: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  venue: z.string().optional(),
  conditions: z
    .object({
      weather: z.string().optional(),
      surface: z.string().optional()
    })
    .optional(),
  sessionId: z.string().optional(),
  notes: z.string().optional(),
  isCurrentBest: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const TrackPointSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  ele: z.number().optional()
});

export const ElevationPointSchema = z.object({
  distanceMeters: z.number().nonnegative(),
  elevationMeters: z.number()
});

export const CourseDocumentSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  name: z.string().min(1),
  sportId: z.string().min(1),
  location: z.string().min(1),
  distanceMeters: z.number().positive(),
  elevationGainMeters: z.number().nonnegative(),
  surface: z.string().min(1),
  notes: z.string().optional(),
  trackPoints: z.array(TrackPointSchema).optional(),
  elevationProfile: z.array(ElevationPointSchema).optional(),
  svgRouteOutline: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const MaintenanceModeSchema = z.enum(["distance", "time"]);
export const MaintenanceStatusSchema = z.enum(["ok", "due_soon", "overdue"]);

export const MaintenanceTaskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mode: MaintenanceModeSchema,
  intervalValue: z.number().positive(),
  lastResetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastResetUsageKm: z.number().nonnegative(),
  currentUsageSinceReset: z.number().nonnegative(),
  remaining: z.number(),
  remainingPercent: z.number(),
  status: MaintenanceStatusSchema
});

export const MaintenanceLogSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  taskName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  costAmount: z.number().nonnegative().optional(),
  costCurrency: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional(),
  createdAt: z.string()
});

export const EquipmentTypeSchema = z.enum([
  "shoes",
  "bike",
  "chain",
  "wheelset",
  "racket",
  "skis",
  "oar",
  "watch",
  "other"
]);

export const EquipmentItemSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  name: z.string().min(1),
  type: EquipmentTypeSchema,
  brand: z.string().min(1),
  model: z.string().optional(),
  imageUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "A képlinknek https:// URL-nek kell lennie."
    })
    .optional()
    .or(z.literal("")),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startingUsageKm: z.number().nonnegative().default(0),
  startingUsageHours: z.number().nonnegative().default(0),
  sportIds: z.array(z.string()).default([]),
  status: z.enum(["active", "retired"]).default("active"),
  notes: z.string().optional(),
  totalKm: z.number().nonnegative().default(0),
  totalHours: z.number().nonnegative().default(0),
  maintenanceTasks: z.array(MaintenanceTaskSchema).default([]),
  maintenanceHistory: z.array(MaintenanceLogSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const AllergenTagSchema = z.enum([
  "gluten",
  "lactose",
  "nuts",
  "soy",
  "eggs",
  "fish_shellfish",
  "peanuts",
  "sesame",
  "celery",
  "mustard"
]);

export const MealOptionIngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  unit: z.string().min(1)
});

export const MealPlanOptionSchema = z.object({
  id: z.string().min(1),
  sourceFoodId: z.string().optional(),
  isDeletedFood: z.boolean().optional(),
  name: z.string().min(1),
  label: z.string().optional(),
  authorRole: z.enum(["athlete", "dietitian"]),
  authorName: z.string().optional(),
  authorUid: z.string().optional(),
  photoUrl: z.string().optional(),
  baseCalories: z.number().nonnegative(),
  baseProteinGrams: z.number().nonnegative(),
  baseCarbsGrams: z.number().nonnegative(),
  baseFatGrams: z.number().nonnegative(),
  baseServingGrams: z.number().positive().optional(),
  baseServingUnit: z.string().optional(),
  minPortionMultiplier: z.number().positive().default(0.5),
  maxPortionMultiplier: z.number().positive().default(2.0),
  defaultPortionMultiplier: z.number().positive().default(1.0),
  tags: z.array(z.string()).default([]),
  dayTypeTags: z.array(z.enum(["rest", "light", "moderate", "hard", "competition"])).default([]),
  dayTypeScaling: z.record(z.string(), z.number()).optional(),
  allergens: z.array(AllergenTagSchema).optional(),
  ingredients: z.array(MealOptionIngredientSchema).optional(),
  notes: z.string().optional(),
  usageCount: z.number().nonnegative().optional(),
  order: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const MealPlanSlotSchema = z.object({
  slotId: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
  targetCaloriesRange: z.object({ min: z.number(), max: z.number() }).optional(),
  targetProteinRange: z.object({ min: z.number(), max: z.number() }).optional(),
  targetCarbsRange: z.object({ min: z.number(), max: z.number() }).optional(),
  targetFatRange: z.object({ min: z.number(), max: z.number() }).optional(),
  options: z.array(MealPlanOptionSchema).default([])
});

export const MealPlanDocumentSchema = StandardRecordMetadataSchema.extend({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  authorUid: z.string().min(1),
  authorRole: z.enum(["athlete", "dietitian"]),
  authorName: z.string().min(1),
  isActive: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetCalories: z.object({ min: z.number(), max: z.number() }).optional(),
  targetProteinGrams: z.object({ min: z.number(), max: z.number() }).optional(),
  targetCarbsGrams: z.object({ min: z.number(), max: z.number() }).optional(),
  targetFatGrams: z.object({ min: z.number(), max: z.number() }).optional(),
  slots: z.array(MealPlanSlotSchema).default([]),
  archived: z.boolean().optional(),
  deletedAt: z.string().optional(),
  schemaVersion: z.number().default(1)
});

export const PlannedDayOptionSelectionSchema = z.object({
  optionId: z.string().min(1),
  optionSnapshot: MealPlanOptionSchema,
  portionMultiplier: z.number().positive(),
  effectiveCalories: z.number().nonnegative(),
  effectiveProteinGrams: z.number().nonnegative(),
  effectiveCarbsGrams: z.number().nonnegative(),
  effectiveFatGrams: z.number().nonnegative(),
  status: z.enum(["planned", "consumed", "replaced"]),
  loggedAt: z.string().optional(),
  actualConsumedPortion: z.number().optional(),
  replacementItemName: z.string().optional()
});

export const PlannedDaySlotSchema = z.object({
  slotId: z.string().min(1),
  slotName: z.string().min(1),
  selectedOptions: z.array(PlannedDayOptionSelectionSchema)
});

export const PlannedDayDocumentSchema = StandardRecordMetadataSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  athleteId: z.string().min(1),
  planId: z.string().optional(),
  dayType: z.enum(["rest", "light", "moderate", "hard", "competition"]).optional(),
  slots: z.array(PlannedDaySlotSchema).default([]),
  totalCalories: z.number().nonnegative(),
  totalProteinGrams: z.number().nonnegative(),
  totalCarbsGrams: z.number().nonnegative(),
  totalFatGrams: z.number().nonnegative(),
  isLocked: z.boolean().optional(),
  notes: z.string().optional(),
  schemaVersion: z.number().default(1)
});

export const DayTemplateDocumentSchema = StandardRecordMetadataSchema.extend({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  name: z.string().min(1),
  dayType: z.enum(["rest", "light", "moderate", "hard", "competition"]),
  slots: z.array(PlannedDaySlotSchema).default([]),
  totalCalories: z.number().nonnegative(),
  totalProteinGrams: z.number().nonnegative(),
  totalCarbsGrams: z.number().nonnegative(),
  totalFatGrams: z.number().nonnegative(),
  notes: z.string().optional(),
  schemaVersion: z.number().default(1)
});

