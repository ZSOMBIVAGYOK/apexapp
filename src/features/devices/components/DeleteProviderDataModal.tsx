import React, { useState } from "react";
import { BottomSheet, Button, showToast } from "@shared/ui";
import { Trash2, AlertTriangle } from "lucide-react";
import { DeviceProvider } from "@shared/types/devices";

export interface DeleteProviderDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: DeviceProvider | null;
  providerName: string;
  onConfirmDelete: (provider: DeviceProvider) => Promise<void> | void;
}

export const DeleteProviderDataModal: React.FC<DeleteProviderDataModalProps> = ({
  isOpen,
  onClose,
  provider,
  providerName,
  onConfirmDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!provider) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(provider);
      showToast({
        title: "Adatok törölve",
        message: `A(z) ${providerName} által rögzített összes korábbi edzés és szinkronizált adat törölve lett.`,
        type: "success"
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nem sikerült az adatok törlése.";
      showToast({
        title: "Törlési hiba",
        message,
        type: "error"
      });
    } finally {

      setIsDeleting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Eszközadatok végleges törlése"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Mégse
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Adatok végleges törlése
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 p-3.5 rounded-14 bg-rest/10 border border-rest/20 text-rest">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-12 leading-relaxed">
            <p className="font-semibold text-13">Figyelem: Ez a művelet nem visszavonható!</p>
            <p className="mt-1">
              Csak a(z) <span className="font-bold underline">{providerName}</span> forrásból
              származó edzések, alvás- és napi biometrikus adatok kerülnek törlésre. A kézi
              naplóbejegyzések és a más eszközökről (pl. WHOOP vagy Fájl import) származó adatok
              érintetlenek maradnak.
            </p>
          </div>
        </div>

        <p className="text-13 text-text-secondary">
          Biztosan törölni szeretnéd a(z) <strong>{providerName}</strong> összes szinkronizált
          adatát a fiókodból?
        </p>
      </div>
    </BottomSheet>
  );
};
