import { useAuthStore } from "@features/auth/authStore";
import { DataMode, SupportMode, UserRole, UnitSystem } from "@shared/types";

export interface AppModeInfo {
  dataMode: DataMode;
  supportMode: SupportMode[];
  roles: UserRole[];
  // Derived mode checks
  isManualOnly: boolean;
  isDeviceOnly: boolean;
  isHybrid: boolean;
  isSolo: boolean;
  hasCoach: boolean;
  hasSpecialist: boolean;
  isAthlete: boolean;
  isCoach: boolean;
  isSpecialist: boolean;
  plateBasedViewOnly: boolean;
  units: UnitSystem;
  // Mutators for adaptive configuration
  setDataMode: (mode: DataMode) => Promise<void>;
  setSupportMode: (modes: SupportMode[]) => Promise<void>;
  toggleRole: (role: UserRole) => Promise<void>;
}

export const useAppMode = (): AppModeInfo => {
  const { user, updateProfile } = useAuthStore();

  const dataMode: DataMode = user?.dataMode || "hybrid";
  const supportMode: SupportMode[] = user?.supportMode?.length ? user.supportMode : ["solo"];
  const roles: UserRole[] = user?.roles?.length ? user.roles : user?.role ? [user.role] : ["athlete"];
  const units: UnitSystem = user?.units || "metric";
  const plateBasedViewOnly = Boolean(user?.plateBasedViewOnly);

  const isManualOnly = dataMode === "manual";
  const isDeviceOnly = dataMode === "device";
  const isHybrid = dataMode === "hybrid";

  const isSolo = supportMode.includes("solo") && !supportMode.includes("coach");
  const hasCoach = supportMode.includes("coach");
  const hasSpecialist = supportMode.includes("specialist");

  const isAthlete = roles.includes("athlete");
  const isCoach = roles.includes("coach");
  const isSpecialist = roles.includes("specialist");

  const setDataMode = async (mode: DataMode) => {
    await updateProfile({ dataMode: mode });
  };

  const setSupportMode = async (modes: SupportMode[]) => {
    await updateProfile({ supportMode: modes });
  };

  const toggleRole = async (role: UserRole) => {
    const exists = roles.includes(role);
    let newRoles: UserRole[];
    if (exists) {
      if (roles.length <= 1) return; // Prevent empty roles
      newRoles = roles.filter((r) => r !== role);
    } else {
      newRoles = [...roles, role];
    }
    await updateProfile({
      roles: newRoles,
      role: newRoles[0]
    });
  };

  return {
    dataMode,
    supportMode,
    roles,
    isManualOnly,
    isDeviceOnly,
    isHybrid,
    isSolo,
    hasCoach,
    hasSpecialist,
    isAthlete,
    isCoach,
    isSpecialist,
    plateBasedViewOnly,
    units,
    setDataMode,
    setSupportMode,
    toggleRole
  };
};
