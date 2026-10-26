import {
  CalendarDays,
  Dumbbell,
  Apple,
  Activity,
  Users,
  User,
  Palette,
  LucideIcon
} from "lucide-react";
import { UserRole } from "@shared/types";

export interface NavItemConfig {
  id: string;
  to: string;
  labelKey: string;
  defaultLabel: string;
  icon: LucideIcon;
  exact?: boolean;
  requiresSpecialist?: boolean;
  devOnly?: boolean;
}

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  {
    id: "today",
    to: "/",
    labelKey: "nav.today",
    defaultLabel: "Ma",
    icon: CalendarDays,
    exact: true
  },
  {
    id: "training",
    to: "/training",
    labelKey: "nav.training",
    defaultLabel: "Terv",
    icon: Dumbbell
  },
  {
    id: "nutrition",
    to: "/nutrition",
    labelKey: "nav.nutrition",
    defaultLabel: "Étrend",
    icon: Apple
  },
  {
    id: "insights",
    to: "/insights",
    labelKey: "nav.insights",
    defaultLabel: "Regeneráció",
    icon: Activity
  },
  {
    id: "coach",
    to: "/coach",
    labelKey: "nav.coach",
    defaultLabel: "Csapat",
    icon: Users,
    requiresSpecialist: true
  },
  {
    id: "settings",
    to: "/settings",
    labelKey: "nav.settings",
    defaultLabel: "Profil",
    icon: User
  },
  {
    id: "design",
    to: "/design",
    labelKey: "nav.design",
    defaultLabel: "Design System",
    icon: Palette,
    devOnly: true
  }
];

export const getNavItemsForRole = (
  role: UserRole = "athlete",
  isDev: boolean = process.env.NODE_ENV !== "production"
): NavItemConfig[] => {
  return ALL_NAV_ITEMS.filter((item) => {
    // If devOnly, check isDev
    if (item.devOnly) {
      return isDev;
    }
    // If requires specialist role, check if user is coach or specialist
    if (item.requiresSpecialist) {
      return role === "coach" || role === "specialist";
    }
    return true;
  });
};
