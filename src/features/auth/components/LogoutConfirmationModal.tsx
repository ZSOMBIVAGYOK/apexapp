import React from "react";
import { AlertTriangle, RefreshCw, LogOut, X } from "lucide-react";
import { Button } from "@shared/ui/Button";

export interface LogoutConfirmationModalProps {
  isOpen: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onClose: () => void;
  onSync: () => Promise<void>;
  onForceLogout: () => Promise<void>;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  pendingCount,
  isSyncing,
  onClose,
  onSync,
  onForceLogout
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface-primary border border-border-default rounded-2xl shadow-2xl p-6 overflow-hidden">
        <button
          onClick={onClose}
          disabled={isSyncing}
          className="absolute top-4 right-4 p-1.5 text-text-tertiary hover:text-text-primary rounded-full hover:bg-surface-secondary transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-status-caution/15 text-status-caution shrink-0">
            <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Szinkronizálatlan adatok
            </h3>
            <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
              Még <span className="font-semibold text-text-primary">{pendingCount}</span> fel nem töltött módosításod van a készülékeden.
              Kérjük, várd meg a szinkronizálást, mielőtt kijelentkezel, különben az adataid elveszhetnek!
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            variant="primary"
            onClick={onSync}
            disabled={isSyncing}
            className="w-full justify-center"
            leftIcon={<RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />}
          >
            {isSyncing ? "Szinkronizálás folyamatban..." : "Szinkronizálás és kijelentkezés"}
          </Button>

          <Button
            variant="danger"
            onClick={onForceLogout}
            disabled={isSyncing}
            className="w-full justify-center"
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Kijelentkezés mindenképp (nem ajánlott)
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSyncing}
            className="w-full justify-center text-text-tertiary"
          >
            Mégse, maradok
          </Button>
        </div>
      </div>
    </div>
  );
};
