import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationType =
  | "checkin_reminder"
  | "upcoming_workout"
  | "coach_message"
  | "staff_alert"
  | "equipment_maintenance"
  | "system";

export interface ApexNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  priority?: "normal" | "high" | "urgent";
}

export interface NotificationSettings {
  checkinReminderEnabled: boolean;
  checkinReminderTime: string; // e.g. "07:30"
  workoutReminderEnabled: boolean;
  coachMessageEnabled: boolean;
  staffAlertsEnabled: boolean;
  maintenanceRemindersEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "07:00"
}

interface NotificationState {
  notifications: ApexNotification[];
  settings: NotificationSettings;
  unreadCount: number;
  addNotification: (
    item: Omit<ApexNotification, "id" | "timestamp" | "read">
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updateSettings: (partial: Partial<NotificationSettings>) => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  checkinReminderEnabled: true,
  checkinReminderTime: "07:30",
  workoutReminderEnabled: true,
  coachMessageEnabled: true,
  staffAlertsEnabled: true,
  maintenanceRemindersEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00"
};

const INITIAL_NOTIFICATIONS: ApexNotification[] = [
  {
    id: "notif-001",
    type: "coach_message",
    title: "Új edzői üzenet",
    message: "Kovács Péter: 'Kiváló laktát-küszöb sorozat volt tegnap! A mai úszásnál fókuszálj a technikára.'",
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    read: false,
    link: "/coach",
    priority: "normal"
  },
  {
    id: "notif-002",
    type: "upcoming_workout",
    title: "Közelgő edzés: 45 perc múlva",
    message: "10:00 - 5 x 400m Laktát-küszöb sorozat (Úszás) • Z4 pulzustartomány",
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    read: false,
    link: "/training",
    priority: "normal"
  },
  {
    id: "notif-003",
    type: "checkin_reminder",
    title: "Reggeli Check-in ideje!",
    message: "Rögzítsd a mai alvásodat és az ébredési jóllétedet a pontos napi készenléthez (~30 mp).",
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    read: true,
    link: "/checkin",
    priority: "high"
  }
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,
      settings: DEFAULT_SETTINGS,
      unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.read).length,

      addNotification: (item) => {
        const { settings } = get();

        // Check quiet hours
        if (settings.quietHoursEnabled) {
          const now = new Date();
          const currentHourMin = `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes()
          ).padStart(2, "0")}`;

          const isQuiet =
            settings.quietHoursStart > settings.quietHoursEnd
              ? currentHourMin >= settings.quietHoursStart ||
                currentHourMin < settings.quietHoursEnd
              : currentHourMin >= settings.quietHoursStart &&
                currentHourMin < settings.quietHoursEnd;

          // If in quiet hours and not urgent, suppress sound or mark silent
          if (isQuiet && item.priority !== "urgent") {
            // Can still be added to inbox silently
          }
        }

        // Check category toggles
        if (
          (item.type === "checkin_reminder" && !settings.checkinReminderEnabled) ||
          (item.type === "upcoming_workout" && !settings.workoutReminderEnabled) ||
          (item.type === "coach_message" && !settings.coachMessageEnabled) ||
          (item.type === "staff_alert" && !settings.staffAlertsEnabled)
        ) {
          return;
        }

        const newNotif: ApexNotification = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          read: false
        };

        set((state) => {
          const updated = [newNotif, ...state.notifications];
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length
          };
        });
      },

      markAsRead: (id: string) => {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length
          };
        });
      },

      markAllAsRead: () => {
        set((state) => {
          const updated = state.notifications.map((n) => ({ ...n, read: true }));
          return {
            notifications: updated,
            unreadCount: 0
          };
        });
      },

      removeNotification: (id: string) => {
        set((state) => {
          const updated = state.notifications.filter((n) => n.id !== id);
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length
          };
        });
      },

      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0
        });
      },

      updateSettings: (partial) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...partial
          }
        }));
      }
    }),
    {
      name: "apex-notification-store"
    }
  )
);
