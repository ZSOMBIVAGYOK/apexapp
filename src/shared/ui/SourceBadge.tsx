import React from "react";
import { Edit3, Watch, Activity, FileText } from "lucide-react";

export type DataSource = "Manual" | "Garmin" | "WHOOP" | "File";

export interface SourceBadgeProps {
  source: DataSource;
  size?: "sm" | "md";
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  size = "sm",
  className = ""
}) => {
  const configs: Record<DataSource, { label: string; icon: React.ReactNode; color: string }> = {
    Manual: {
      label: "Kézi",
      icon: <Edit3 className="h-3 w-3" aria-hidden="true" />,
      color: "bg-text-tertiary/15 text-text-secondary border-text-tertiary/20"
    },
    Garmin: {
      label: "Garmin",
      icon: <Watch className="h-3 w-3 text-cyan-400" aria-hidden="true" />,
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    },
    WHOOP: {
      label: "WHOOP",
      icon: <Activity className="h-3 w-3 text-rose-400" aria-hidden="true" />,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20"
    },
    File: {
      label: "Fájl",
      icon: <FileText className="h-3 w-3 text-amber-400" aria-hidden="true" />,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    }
  };

  const current = configs[source] || configs.Manual;
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
