import React, { useState } from "react";

export type AvatarSize = "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "ready" | "caution" | "rest" | "online" | "offline";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  status?: AvatarStatus;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = "md",
  status,
  className = "",
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (n: string) => {
    const parts = n.trim().split(" ");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizeStyles: Record<AvatarSize, { container: string; text: string; dot: string }> = {
    sm: { container: "h-7 w-7", text: "text-[11px]", dot: "h-2 w-2 ring-1" },
    md: { container: "h-9 w-9", text: "text-12", dot: "h-2.5 w-2.5 ring-2" },
    lg: { container: "h-12 w-12", text: "text-16", dot: "h-3 w-3 ring-2" },
    xl: { container: "h-16 w-16", text: "text-20", dot: "h-3.5 w-3.5 ring-2" }
  };

  const statusStyles: Record<AvatarStatus, string> = {
    ready: "bg-status-ready",
    caution: "bg-status-caution",
    rest: "bg-status-rest",
    online: "bg-status-ready",
    offline: "bg-text-tertiary"
  };

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-bg-elevated border border-border-hairline select-none ${sizeStyles[size].container} ${className}`}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className={`font-semibold text-text-primary ${sizeStyles[size].text}`}>
          {getInitials(name)}
        </span>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-bg-surface ${sizeStyles[size].dot} ${statusStyles[status]}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
