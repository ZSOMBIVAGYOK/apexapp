import React from "react";
import { Edit3, Watch, Activity, FileText } from "lucide-react";
import { DataSourceOrigin } from "@shared/types";

export type DataSource =
  | DataSourceOrigin
  | "Manual" | "Garmin" | "WHOOP" | "File"
  | "manual" | "garmin" | "whoop" | "file"
  | "apple_health" | "polar" | "suunto" | "wahoo" | "oura" | "system"
  | string;

export interface SourceBadgeProps {
  source: DataSource;
  confidence?: number;
  size?: "sm" | "md";
  className?: string;
}

interface SourceConfigItem {
  label: string;
  icon: React.ReactNode;
  color: string;
}

const FALLBACK_CONFIG: SourceConfigItem = {
  label: "Kézi",
  icon: <Edit3 className="h-3 w-3" aria-hidden="true" />,
  color: "bg-text-tertiary/15 text-text-secondary border-text-tertiary/20"
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  size = "sm",
  className = ""
}) => {
  const normKey = (source || "manual").toLowerCase();

  const configs: Record<string, SourceConfigItem> = {
    manual: {
      label: "Kézi",
      icon: <Edit3 className="h-3 w-3" aria-hidden="true" />,
      color: "bg-text-tertiary/15 text-text-secondary border-text-tertiary/20"
    },
    garmin: {
      label: "Garmin",
      icon: <Watch className="h-3 w-3 text-cyan-400" aria-hidden="true" />,
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    },
    whoop: {
      label: "WHOOP",
      icon: <Activity className="h-3 w-3 text-rose-400" aria-hidden="true" />,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20"
    },
    file: {
      label: "Fájl",
      icon: <FileText className="h-3 w-3 text-amber-400" aria-hidden="true" />,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    },
    apple_health: {
      label: "Apple Health",
      icon: <Activity className="h-3 w-3 text-rose-400" aria-hidden="true" />,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20"
    },
    polar: {
      label: "Polar",
      icon: <Watch className="h-3 w-3 text-blue-400" aria-hidden="true" />,
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20"
    },
    suunto: {
      label: "Suunto",
      icon: <Watch className="h-3 w-3 text-red-400" aria-hidden="true" />,
      color: "bg-red-500/10 text-red-400 border-red-500/20"
    },
    wahoo: {
      label: "Wahoo",
      icon: <Activity className="h-3 w-3 text-blue-400" aria-hidden="true" />,
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20"
    },
    oura: {
      label: "Oura",
      icon: <Activity className="h-3 w-3 text-purple-400" aria-hidden="true" />,
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20"
    },
    system: {
      label: "System",
      icon: <Edit3 className="h-3 w-3" aria-hidden="true" />,
      color: "bg-text-tertiary/15 text-text-secondary border-text-tertiary/20"
    }
  };

  const current: SourceConfigItem = configs[normKey] ?? FALLBACK_CONFIG;
  const sizeStyles = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-12";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium select-none ${sizeStyles} ${current.color} ${className}`}
      title={`Adat forrása: ${current.label}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
