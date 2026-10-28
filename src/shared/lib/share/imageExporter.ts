import { drawOverlay } from "./overlay/renderer";
import { BoundingBox, OverlayData, RenderOptions, ShareImageFormat } from "./overlay/types";

/**
 * Downscale large photos to safe memory dimensions (max 2560px on longest edge)
 * and strip EXIF metadata by re-encoding.
 */
export async function loadAndDownscaleImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("A fotó beolvasása sikertelen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("A fotó betöltése sikertelen."));
      img.onload = () => {
        const maxDimension = 2560;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        if (w <= maxDimension && h <= maxDimension) {
          resolve(img);
          return;
        }

        // Downsample onto temporary canvas
        const scale = maxDimension / Math.max(w, h);
        const targetW = Math.round(w * scale);
        const targetH = Math.round(h * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(img);
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);

        const downscaled = new Image();
        downscaled.onload = () => resolve(downscaled);
        downscaled.onerror = () => resolve(img);
        downscaled.src = canvas.toDataURL("image/jpeg", 0.94);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Ensure web fonts (Inter) are fully loaded before rendering to canvas.
 */
export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }
}

export interface ExportImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  format: ShareImageFormat;
  filename: string;
}

/**
 * Render the session overlay to an exportable image Blob (PNG or JPEG)
 */
export async function exportSessionImage(
  data: OverlayData,
  options: RenderOptions,
  format: ShareImageFormat = "image/png",
  quality = 0.92
): Promise<ExportImageResult> {
  await ensureFontsLoaded();

  const { dimensions, tightCrop } = options;
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Nem sikerült inicializálni a 2D grafikus felületet.");
  }

  // Draw overlay and capture bounding box
  const box: BoundingBox = drawOverlay(ctx, options.layout, data, options);

  let finalCanvas: HTMLCanvasElement = canvas;

  // Handle Tight Crop in Sticker Mode
  if (tightCrop && box.width > 0 && box.height > 0) {
    const pad = 48;
    const cropX = Math.max(0, box.x - pad);
    const cropY = Math.max(0, box.y - pad);
    const cropW = Math.min(canvas.width - cropX, box.width + pad * 2);
    const cropH = Math.min(canvas.height - cropY, box.height + pad * 2);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");
    if (cropCtx) {
      cropCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );
      finalCanvas = cropCanvas;
    }
  }

  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nem sikerült generálni a megosztható képet."));
          return;
        }

        const ext = format === "image/jpeg" ? "jpg" : "png";
        const dateSanitized = data.dateFormatted.replace(/[^a-zA-Z0-9]/g, "-");
        const filename = `apex-${data.sportId}-${dateSanitized}.${ext}`;

        const dataUrl = finalCanvas.toDataURL(format, quality);

        resolve({
          blob,
          dataUrl,
          width: finalCanvas.width,
          height: finalCanvas.height,
          format,
          filename
        });
      },
      format,
      quality
    );
  });
}

/**
 * Share image file using Web Share API with automatic download fallback.
 */
export async function shareOrDownloadImage(
  exportResult: ExportImageResult,
  title: string,
  text: string
): Promise<{ shared: boolean; downloaded: boolean; message?: string }> {
  const { blob, filename } = exportResult;
  const file = new File([blob], filename, { type: exportResult.format });

  // 1. Try Web Share API with files if supported
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title,
        text
      });
      return { shared: true, downloaded: false };
    } catch (err: unknown) {
      // If user aborted / dismissed sheet, do nothing
      if (err instanceof Error && err.name === "AbortError") {
        return { shared: false, downloaded: false };
      }
      // Fall through to download fallback
    }
  }

  // 2. Download Fallback
  downloadBlob(blob, filename);
  return {
    shared: false,
    downloaded: true,
    message: "A közvetlen megosztás nem támogatott ebben a böngészőben, a képet letöltöttük."
  };
}

/**
 * Trigger client-side file download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 250);
}

export interface CopyImageResult {
  copied: boolean;
  message?: string;
  isTouch?: boolean;
}

/**
 * Copy generated image to clipboard as PNG using the Promise-based ClipboardItem API.
 * Uses the promise-based form so Safari keeps the user gesture active.
 *
 * @param blobPromise Promise resolving to a PNG Blob or a direct PNG Blob
 */
export async function copyImageToClipboard(
  blobPromise: Promise<Blob> | Blob
): Promise<CopyImageResult> {
  const isTouch =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== "function" ||
    typeof ClipboardItem === "undefined"
  ) {
    return {
      copied: false,
      isTouch,
      message: isTouch
        ? "A böngésző nem engedélyezi a közvetlen vágólapra másolást. Érintőkijelzőn tartsd nyomva a képet a mentéshez, vagy használd a Letöltés gombot!"
        : "A böngésző nem támogatja a kép vágólapra másolását. Használd a Letöltés gombot!"
    };
  }

  try {
    const resolvedPromise =
      blobPromise instanceof Promise ? blobPromise : Promise.resolve(blobPromise);

    // Safari 13.1+ requires a Promise that resolves to Blob passed to ClipboardItem
    const item = new ClipboardItem({
      "image/png": resolvedPromise
    });

    await navigator.clipboard.write([item]);
    return { copied: true, isTouch };
  } catch (err: unknown) {
    console.warn("ClipboardItem write failed:", err);
    return {
      copied: false,
      isTouch,
      message: isTouch
        ? "A böngésző letiltotta a vágólapra másolást. Érintőkijelzőn tartsd nyomva a képet a mentéshez, vagy használd a Letöltés gombot!"
        : "A böngésző letiltotta a vágólapra másolást. Használd a Letöltés gombot!"
    };
  }
}

