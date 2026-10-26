import React from "react";
import { BottomSheet, Badge, Button } from "@shared/ui";
import { FileImportItem } from "@shared/types/devices";
import { FileText, Calendar } from "lucide-react";

export interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: FileImportItem[];
  onClearHistory?: () => void;
}

export const ImportHistoryModal: React.FC<ImportHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Fájl importálási előzmények"
      description="A manuálisan feltöltött FIT, TCX, GPX és CSV fájlok audit naplója."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {onClearHistory && history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearHistory} className="text-rest hover:text-rest">
              Előzmények ürítése
            </Button>
          )}
          <div className="ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Bezárás
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 py-2">
        {history.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <FileText className="h-10 w-10 text-text-tertiary mx-auto stroke-1" />
            <p className="text-14 font-medium text-text-secondary">Nincsenek még importált fájlok</p>
            <p className="text-12 text-text-tertiary">
              A feltöltött edzésfájlok feldolgozási eredményei itt fognak megjelenni.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-hairline">
            {history.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-10 bg-surface-elevated text-brand shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-13 font-medium text-text-primary truncate">
                        {item.fileName}
                      </span>
                      <span className="text-10 uppercase px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-text-secondary border border-border-hairline">
                        {item.fileType}
                      </span>
                    </div>

                    <p className="text-11 text-text-secondary mt-0.5 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 inline text-text-tertiary" />
                      {new Date(item.uploadedAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      <span>•</span>
                      <span>{Math.round(item.fileSizeBytes / 1024)} KB</span>
                      {item.activity && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{item.activity.sport}</span>
                          {item.activity.trainingLoad ? ` (Load: ${item.activity.trainingLoad})` : ""}
                        </>
                      )}
                    </p>

                    {item.reason && (
                      <p className="text-11 text-text-tertiary mt-1 italic">
                        {item.reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  {item.status === "created" && (
                    <Badge variant="ready" size="sm" dot>
                      Feldolgozva
                    </Badge>
                  )}
                  {item.status === "duplicate" && (
                    <Badge variant="caution" size="sm" dot>
                      Duplikátum
                    </Badge>
                  )}
                  {item.status === "failed" && (
                    <Badge variant="rest" size="sm" dot>
                      Hiba
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
