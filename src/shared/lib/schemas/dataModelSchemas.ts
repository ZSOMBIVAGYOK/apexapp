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

export const CompletedSessionDocumentSchema = StandardRecordMetadataSchema.extend({
  sessionId: z.string().min(1),
  athleteId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sport: z.string().min(1),
  title: z.string().min(1),
  startTime: z.string(),
  durationMinutes: z.number().positive(),
  rpe: z.number().min(1).max(10),
  targetIntensityRpe: z.number().min(1).max(10).optional(),
  trainingLoad: z.number().optional(),
  metrics: z
    .object({
      avgHeartRate: z.number().optional(),
      maxHeartRate: z.number().optional(),
      avgPower: z.number().optional(),
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
