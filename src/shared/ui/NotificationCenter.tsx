import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  CheckCircle2,
  Dumbbell,
  MessageSquare,
  AlertTriangle,
  X,
  Check,
  Trash2
} from "lucide-react";
import { useNotificationStore, ApexNotification } from "../lib/notifications/notificationStore";
import { Badge } from "./Badge";
import { Button } from "./Button";

export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isHu = i18n.language.startsWith("hu");

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification
  } = useNotificationStore();

  const [filter, setFilter] = useState<"all" | "unread" | "coach" | "workout">("all");

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.read;
    if (filter === "coach") return notif.type === "coach_message";
    if (filter === "workout") return notif.type === "upcoming_workout";
    return true;
  });

  const getNotificationIcon = (type: ApexNotification["type"]) => {
    switch (type) {
      case "coach_message":
        return <MessageSquare className="h-4 w-4 text-brand" />;
      case "upcoming_workout":
        return <Dumbbell className="h-4 w-4 text-status-caution" />;
      case "checkin_reminder":
        return <CheckCircle2 className="h-4 w-4 text-status-ready" />;
      case "staff_alert":
        return <AlertTriangle className="h-4 w-4 text-status-rest" />;
      default:
        return <Bell className="h-4 w-4 text-text-secondary" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    if (diffMins < 60) {
      return isHu ? `${diffMins} perce` : `${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return isHu ? `${diffHours} órája` : `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return isHu ? `${diffDays} napja` : `${diffDays}d ago`;
  };

  const handleNotificationClick = (notif: ApexNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Popover Panel */}
      <div className="relative z-10 w-full max-w-md rounded-20 border border-border-hairline bg-surface-elevated shadow-elevated flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand" />
            <h2 className="text-16 font-bold text-text-primary">
              {isHu ? "Értesítési Központ" : "Notifications"}
            </h2>
            {unreadCount > 0 && (
              <Badge variant="brand" size="sm">
                {unreadCount} {isHu ? "új" : "new"}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Pills & Actions Bar */}
        <div className="p-3 bg-surface border-b border-border-hairline flex items-center justify-between gap-2 overflow-x-auto text-12">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-8 font-medium transition-colors ${
                filter === "all"
                  ? "bg-brand text-white"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {isHu ? "Mind" : "All"} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-2.5 py-1 rounded-8 font-medium transition-colors ${
                filter === "unread"
                  ? "bg-brand text-white"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {isHu ? "Olvasatlan" : "Unread"} ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("coach")}
              className={`px-2.5 py-1 rounded-8 font-medium transition-colors ${
                filter === "coach"
                  ? "bg-brand text-white"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {isHu ? "Edzői" : "Coach"}
            </button>
            <button
              type="button"
              onClick={() => setFilter("workout")}
              className={`px-2.5 py-1 rounded-8 font-medium transition-colors ${
                filter === "workout"
                  ? "bg-brand text-white"
                  : "bg-surface-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {isHu ? "Edzés" : "Workouts"}
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                title={isHu ? "Mind olvasottnak jelölése" : "Mark all as read"}
                className="p-1.5 rounded-8 text-text-secondary hover:text-brand hover:bg-surface-elevated transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                title={isHu ? "Összes törlése" : "Clear all"}
                className="p-1.5 rounded-8 text-text-secondary hover:text-status-rest hover:bg-surface-elevated transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notification Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-hairline p-2">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-text-secondary space-y-2">
              <Bell className="h-8 w-8 mx-auto text-text-tertiary opacity-40" />
              <p className="text-14 font-medium">
                {isHu ? "Nincsenek értesítések" : "No notifications"}
              </p>
              <p className="text-12 text-text-tertiary">
                {filter === "unread"
                  ? (isHu ? "Minden értesítést elolvastál." : "All notifications are read.")
                  : (isHu ? "Új értesítések itt fognak megjelenni." : "New alerts will appear here.")}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-12 transition-all cursor-pointer flex items-start gap-3 group relative ${
                  notif.read
                    ? "opacity-75 hover:opacity-100 hover:bg-surface"
                    : "bg-brand/5 border border-brand/20 shadow-sm hover:bg-brand/10"
                }`}
              >
                <div className="h-9 w-9 rounded-full bg-surface border border-border-hairline flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-13 truncate ${
                        notif.read ? "font-medium text-text-primary" : "font-bold text-text-primary"
                      }`}
                    >
                      {notif.title}
                    </h4>
                    <span className="text-10 text-text-tertiary whitespace-nowrap">
                      {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>

                  <p className="text-12 text-text-secondary line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.link && (
                    <span className="inline-block text-11 text-brand font-medium pt-0.5">
                      {isHu ? "Megtekintés →" : "View →"}
                    </span>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notif.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-text-primary rounded-6 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface border-t border-border-hairline flex items-center justify-between text-11 text-text-tertiary">
          <span>{isHu ? "Firebase Cloud Messaging aktív" : "FCM active"}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigate("/settings");
              onClose();
            }}
            className="text-11 h-7 px-2"
          >
            {isHu ? "Beállítások" : "Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
};
