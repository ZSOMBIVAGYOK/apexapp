import React, { useState, useEffect, useRef } from "react";
import { BottomSheet, Button, Input, showToast } from "@shared/ui";
import { Camera, Barcode, Search, AlertCircle } from "lucide-react";
import { FoodService } from "@shared/lib/nutrition";
import { FoodItem } from "@shared/types/nutrition";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodFound: (food: FoodItem) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onFoodFound
}) => {
  const [manualBarcode, setManualBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if BarcodeDetector API and getUserMedia exist
    if (typeof window !== "undefined") {
      const hasMedia = !!navigator.mediaDevices?.getUserMedia;
      setHasCameraSupport(hasMedia);
    }
  }, []);

  const handleLookup = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const food = await FoodService.lookupBarcode(trimmed);
      if (food) {
        showToast({
          title: "Termék megtalálva",
          message: `${food.name} (${food.brand || "Ismeretlen márka"})`,
          type: "success"
        });
        onFoodFound(food);
        onClose();
      } else {
        showToast({
          title: "Nem található vonalkód",
          message: `A vonalkód (${trimmed}) nincs az adatbázisban. Rögzítsd kézzel!`,
          type: "warning"
        });
      }
    } catch {
      showToast({
        title: "Keresési hiba",
        message: "Nem sikerült lekérni a vonalkód adatait.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    setCameraActive(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch {
      showToast({
        title: "Kamera nem elérhető",
        message: "Kérjük add meg a vonalkódot kézzel.",
        type: "warning"
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Vonalkód beolvasása"
      description="Irányítsd a kamerát a csomagolás vonalkódjára, vagy add meg a számsort kézzel."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Mégse
          </Button>
          <Button
            variant="primary"
            onClick={() => handleLookup(manualBarcode)}
            isLoading={isLoading}
            disabled={!manualBarcode.trim()}
          >
            Keresés
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {/* Camera stream or launcher */}
        {hasCameraSupport && (
          <div className="rounded-20 border border-border-hairline bg-bg-surface overflow-hidden p-4 text-center">
            {cameraActive ? (
              <div className="relative aspect-video bg-black rounded-12 overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-brand animate-pulse shadow-lg" />
                <div className="absolute top-2 right-2">
                  <Button variant="secondary" size="sm" onClick={stopCamera}>
                    Kamera leállítása
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-14 font-semibold text-text-primary">
                    Kamera alapú beolvasás
                  </h4>
                  <p className="text-12 text-text-secondary mt-1">
                    Gyors azonosítás Open Food Facts és USDA adatbázisokból
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={startCamera}>
                  Kamera indítása
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Manual Barcode Input Fallback */}
        <div className="space-y-2">
          <label className="text-12 font-medium text-text-secondary block">
            Vonalkód kézi megadása (EAN / UPC számsor)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="pl. 7622210449283"
                type="number"
                leftIcon={<Barcode className="w-4 h-4 text-text-tertiary" />}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => handleLookup(manualBarcode)}
              disabled={!manualBarcode.trim() || isLoading}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick test barcodes for demonstration */}
        <div className="rounded-12 bg-bg-elevated p-3 border border-border-hairline text-12 text-text-secondary space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-text-primary">
            <AlertCircle className="w-4 h-4 text-brand" />
            <span>Gyakori teszt vonalkódok:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Zabpehely", code: "5997255700012" },
              { label: "Görög joghurt", code: "5201051000004" },
              { label: "Energiagél", code: "5060123456789" }
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setManualBarcode(item.code);
                  handleLookup(item.code);
                }}
                className="px-2.5 py-1 rounded-8 bg-bg-surface border border-border-hairline text-11 text-text-primary hover:border-brand transition-colors"
              >
                {item.label} ({item.code.slice(-4)})
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
