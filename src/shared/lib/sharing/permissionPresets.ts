import {
  MemberRole,
  MemberSpecialty,
  ModulePermissions,
  SharingModule
} from "@shared/types";

export type PresetId =
  | "coach"
  | "dietitian"
  | "physiotherapist"
  | "strengthCoach"
  | "psychologist"
  | "physician";

export interface PresetDefinition {
  id: PresetId;
  role: MemberRole;
  specialty?: MemberSpecialty;
  labelKey: string;
  defaultLabel: string;
  descriptionKey: string;
  defaultDescription: string;
  permissions: ModulePermissions;
}

export interface PermissionPresetsMap {
  coach: PresetDefinition;
  dietitian: PresetDefinition;
  physiotherapist: PresetDefinition;
  strengthCoach: PresetDefinition;
  psychologist: PresetDefinition;
  physician: PresetDefinition;
}

export const PERMISSION_PRESETS: PermissionPresetsMap = {
  coach: {
    id: "coach",
    role: "coach",
    labelKey: "sharing.presets.coach.title",
    defaultLabel: "Vezetőedző / Szakedző",
    descriptionKey: "sharing.presets.coach.desc",
    defaultDescription: "Edzéstervezés írás, regeneráció és eszközök olvasása. Egészségügyi adatok rejtve.",
    permissions: {
      training: "write",
      recovery: "read",
      nutrition: "read",
      devices: "read",
      messages: "write",
      health: "none" // Coaches must NOT see health by default!
    }
  },
  dietitian: {
    id: "dietitian",
    role: "specialist",
    specialty: "nutrition",
    labelKey: "sharing.presets.dietitian.title",
    defaultLabel: "Sportdietetikus",
    descriptionKey: "sharing.presets.dietitian.desc",
    defaultDescription: "Táplálkozás írás, edzés és regeneráció olvasása, üzenetküldés.",
    permissions: {
      nutrition: "write",
      recovery: "read",
      training: "read",
      messages: "write",
      devices: "none",
      health: "none"
    }
  },
  physiotherapist: {
    id: "physiotherapist",
    role: "specialist",
    specialty: "physio",
    labelKey: "sharing.presets.physiotherapist.title",
    defaultLabel: "Gyógytornász / Fizioterapeuta",
    descriptionKey: "sharing.presets.physiotherapist.desc",
    defaultDescription: "Egészség és sérülések írása, edzés és regeneráció olvasása.",
    permissions: {
      health: "write",
      training: "read",
      recovery: "read",
      messages: "write",
      nutrition: "none",
      devices: "none"
    }
  },
  strengthCoach: {
    id: "strengthCoach",
    role: "specialist",
    specialty: "strength",
    labelKey: "sharing.presets.strength.title",
    defaultLabel: "Erőnléti edző",
    descriptionKey: "sharing.presets.strength.desc",
    defaultDescription: "Edzésterhelés és konditermi blokkok írása, regeneráció olvasása.",
    permissions: {
      training: "write",
      recovery: "read",
      messages: "write",
      nutrition: "none",
      devices: "none",
      health: "none"
    }
  },
  psychologist: {
    id: "psychologist",
    role: "specialist",
    specialty: "psychology",
    labelKey: "sharing.presets.psychologist.title",
    defaultLabel: "Sportpszichológus",
    descriptionKey: "sharing.presets.psychologist.desc",
    defaultDescription: "Szubjektív jóllét, stressz és regeneráció olvasása, üzenetküldés.",
    permissions: {
      recovery: "read",
      messages: "write",
      training: "none",
      nutrition: "none",
      devices: "none",
      health: "none"
    }
  },
  physician: {
    id: "physician",
    role: "specialist",
    specialty: "medical",
    labelKey: "sharing.presets.physician.title",
    defaultLabel: "Sportorvos",
    descriptionKey: "sharing.presets.physician.desc",
    defaultDescription: "Teljes egészségügyi hozzáférés írással, regeneráció és táplálkozás olvasása.",
    permissions: {
      health: "write",
      recovery: "read",
      nutrition: "read",
      training: "read",
      messages: "write",
      devices: "none"
    }
  }
};

/**
 * Returns default preset permissions based on member role and specialty
 */
export const getPresetForRole = (
  role: MemberRole,
  specialty?: MemberSpecialty
): ModulePermissions => {
  if (role === "coach") {
    return { ...PERMISSION_PRESETS.coach.permissions };
  }

  switch (specialty) {
    case "nutrition":
      return { ...PERMISSION_PRESETS.dietitian.permissions };
    case "physio":
      return { ...PERMISSION_PRESETS.physiotherapist.permissions };
    case "strength":
      return { ...PERMISSION_PRESETS.strengthCoach.permissions };
    case "psychology":
      return { ...PERMISSION_PRESETS.psychologist.permissions };
    case "medical":
      return { ...PERMISSION_PRESETS.physician.permissions };
    default:
      return {
        training: "read",
        recovery: "read",
        nutrition: "none",
        health: "none",
        devices: "none",
        messages: "write"
      };
  }
};

/**
 * Checks if a permissions set satisfies the required access level
 */
export const hasModuleAccess = (
  permissions: ModulePermissions,
  module: SharingModule,
  requiredLevel: "read" | "write"
): boolean => {
  const current = permissions[module];
  if (!current || current === "none") return false;
  if (requiredLevel === "read") {
    return current === "read" || current === "write";
  }
  return current === "write";
};
