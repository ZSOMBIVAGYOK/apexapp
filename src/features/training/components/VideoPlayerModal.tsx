import React from "react";
import { BottomSheet, Button } from "@shared/ui";
import { parseVideoUrl } from "@shared/lib/exercises/videoUtils";
import { ExternalLink, Video, AlertCircle } from "lucide-react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  title: string;
  description?: string;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  title,
  description
}) => {
  const parsed = parseVideoUrl(videoUrl);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 p-4 sm:p-5">
        {/* Description snippet if present */}
        {description && (
          <p className="text-13 text-text-secondary leading-relaxed bg-bg-surface/50 p-3 rounded-12 border border-border-hairline">
            {description}
          </p>
        )}

        {/* Video Player Box */}
        <div className="overflow-hidden rounded-16 border border-border-hairline bg-black flex items-center justify-center min-h-[200px]">
          {parsed.type === "youtube" && parsed.embedUrl && (
            <iframe
              src={parsed.embedUrl}
              title={title}
              className="w-full aspect-video border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {parsed.type === "vimeo" && parsed.embedUrl && (
            <iframe
              src={parsed.embedUrl}
              title={title}
              className="w-full aspect-video border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}

          {parsed.type === "direct" && parsed.directUrl && (
            <video
              src={parsed.directUrl}
              controls
              className="w-full aspect-video object-contain"
              playsInline
            >
              A böngésződ nem támogatja a közvetlen videólejátszást.
            </video>
          )}

          {parsed.type === "external" && parsed.externalUrl && (
            <div className="p-6 text-center space-y-3 w-full bg-bg-elevated/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Video className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-14 font-semibold text-text-primary">Külső videóforrás</h4>
                <p className="text-12 text-text-secondary mt-1">
                  Ez a link egy külső weboldalra mutat. A videót új lapon tekintheted meg:
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(parsed.externalUrl, "_blank", "noopener,noreferrer")}
                leftIcon={<ExternalLink className="h-4 w-4" />}
                className="mx-auto"
              >
                Megnyitás új lapon
              </Button>
            </div>
          )}

          {(!parsed.isValid || parsed.type === "invalid") && (
            <div className="p-6 text-center space-y-2 text-text-secondary">
              <AlertCircle className="h-8 w-8 text-status-caution mx-auto" />
              <p className="text-13 font-medium text-text-primary">Nem sikerült betölteni a videót</p>
              <p className="text-12 text-text-tertiary">
                {parsed.errorMessage || "Kérjük ellenőrizd, hogy a link biztonságos https:// cím-e."}
              </p>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Bezárás
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
