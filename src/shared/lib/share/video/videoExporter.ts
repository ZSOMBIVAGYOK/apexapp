import { OverlayData } from "../overlay/types";
import { drawVideoOverlay } from "../overlay/widgets/videoHud";
import { getLiveWorkoutData } from "./liveDataEngine";
import {
  VideoExportOptions,
  VideoExportProgress,
  VideoExportResult,
  VideoFraming,
  VideoResolution
} from "./types";

/**
 * Determine best supported video MIME type in the browser.
 */
export function getSupportedExportMimeType(
  preferred: "video/mp4" | "video/webm" = "video/mp4"
): { mimeType: string; extension: "mp4" | "webm" } {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "video/webm", extension: "webm" };
  }

  const mp4Types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4"];
  const webmTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

  if (preferred === "video/mp4") {
    for (const t of mp4Types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return { mimeType: t, extension: "mp4" };
      }
    }
  }

  for (const t of webmTypes) {
    if (MediaRecorder.isTypeSupported(t)) {
      return { mimeType: t, extension: "webm" };
    }
  }

  // Fallback to whatever is supported
  for (const t of mp4Types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return { mimeType: t, extension: "mp4" };
    }
  }

  return { mimeType: "video/webm", extension: "webm" };
}

/**
 * Calculate canvas dimensions according to resolution and framing
 */
export function getExportDimensions(
  videoW: number,
  videoH: number,
  resolution: VideoResolution,
  framing: VideoFraming
): { width: number; height: number; aspectRatio: "9:16" | "4:5" | "1:1" } {
  if (framing === "9:16") {
    return resolution === "1080p"
      ? { width: 1080, height: 1920, aspectRatio: "9:16" }
      : { width: 720, height: 1280, aspectRatio: "9:16" };
  }

  // Original aspect ratio
  const maxDim = resolution === "1080p" ? 1920 : 1280;
  const aspect = videoW / Math.max(1, videoH);

  let width = maxDim;
  let height = Math.round(maxDim / aspect);

  if (videoH > videoW) {
    height = maxDim;
    width = Math.round(maxDim * aspect);
  }

  // Ensure dimensions are even numbers (required by h.264 encoders)
  width = Math.floor(width / 2) * 2;
  height = Math.floor(height / 2) * 2;

  const ratio: "9:16" | "4:5" | "1:1" =
    aspect < 0.6 ? "9:16" : aspect < 0.9 ? "4:5" : "1:1";

  return { width, height, aspectRatio: ratio };
}

/**
 * Draw video element onto canvas with aspect fill centering
 */
function drawVideoFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  targetW: number,
  targetH: number,
  framing: VideoFraming
): void {
  const vidW = video.videoWidth || 1920;
  const vidH = video.videoHeight || 1080;

  if (framing === "original") {
    ctx.drawImage(video, 0, 0, targetW, targetH);
    return;
  }

  // 9:16 Aspect Fill
  const scale = Math.max(targetW / vidW, targetH / vidH);
  const scaledW = vidW * scale;
  const scaledH = vidH * scale;

  const dx = (targetW - scaledW) / 2;
  const dy = (targetH - scaledH) / 2;

  ctx.drawImage(video, dx, dy, scaledW, scaledH);
}

/**
 * Exports video with synchronized live telemetry overlay frame-by-frame.
 */
export async function exportTelemetryVideo(
  videoElement: HTMLVideoElement,
  overlayData: OverlayData,
  options: VideoExportOptions,
  onProgress?: (progress: VideoExportProgress) => void,
  signal?: AbortSignal
): Promise<VideoExportResult> {
  const { resolution, framing, trim, workoutOffsetSec } = options;
  const clipDuration = Math.max(0.5, trim.endSec - trim.startSec);

  // 1. Acquire Screen Wake Lock to prevent mobile screen sleep during export
  let wakeLock: unknown = null;
  if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
    try {
      wakeLock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }).wakeLock.request("screen");
    } catch {
      // Graceful fallback if wakeLock not allowed
    }
  }

  // 2. Setup Canvas
  const vidW = videoElement.videoWidth || 1080;
  const vidH = videoElement.videoHeight || 1920;
  const dims = getExportDimensions(vidW, vidH, resolution, framing);

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // 3. Audio & MediaStream setup
  const { mimeType, extension } = getSupportedExportMimeType(options.format);
  const canvasStream = canvas.captureStream(30);

  // Attempt audio track capture
  let audioContext: AudioContext | null = null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      const source = audioContext.createMediaElementSource(videoElement);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioContext.destination);

      const audioTracks = dest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]!);
      }
    }
  } catch {
    // Proceed without audio track if audioContext fails or video has no audio
  }

  // 4. MediaRecorder setup
  const bps = resolution === "1080p" ? 8_000_000 : 4_000_000;
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: bps
  });

  const recordedChunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise<VideoExportResult>((resolve, reject) => {
    let animFrameId: number;
    let exportStartTime = performance.now();

    const cleanup = () => {
      cancelAnimationFrame(animFrameId);
      if (wakeLock && typeof (wakeLock as { release: () => Promise<void> }).release === "function") {
        (wakeLock as { release: () => Promise<void> }).release().catch(() => {});
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };

    if (signal?.aborted) {
      cleanup();
      return reject(new DOMException("Export aborted by user", "AbortError"));
    }

    signal?.addEventListener("abort", () => {
      cleanup();
      try {
        if (recorder.state === "recording") recorder.stop();
        videoElement.pause();
      } catch {
        // ignore
      }
      reject(new DOMException("Export aborted by user", "AbortError"));
    });

    recorder.onstop = () => {
      cleanup();
      const finalBlob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(finalBlob);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `apex-${overlayData.sportId || "workout"}-${timestamp}.${extension}`;

      resolve({
        blob: finalBlob,
        url,
        filename,
        durationSec: clipDuration,
        resolution: `${dims.width}x${dims.height}`,
        format: extension
      });
    };

    recorder.onerror = (e) => {
      cleanup();
      reject(e);
    };

    // 5. Seek video to trim start
    videoElement.currentTime = trim.startSec;

    const onSeeked = async () => {
      videoElement.removeEventListener("seeked", onSeeked);

      try {
        recorder.start(250); // Emit chunks every 250ms
        await videoElement.play();
        exportStartTime = performance.now();
      } catch (err) {
        cleanup();
        reject(err);
        return;
      }

      // 6. Frame-by-frame render loop
      const renderFrame = () => {
        if (signal?.aborted) return;

        const curTime = videoElement.currentTime;

        // Check if reached trim end
        if (curTime >= trim.endSec || videoElement.ended || videoElement.paused) {
          videoElement.pause();
          if (recorder.state === "recording") {
            recorder.stop();
          }
          return;
        }

        // Draw video background
        drawVideoFrameToCanvas(ctx, videoElement, dims.width, dims.height, framing);

        // Calculate live telemetry at current frame
        const clipElapsed = Math.max(0, curTime - trim.startSec);
        const currentWorkoutOffset = workoutOffsetSec + clipElapsed;

        const liveData = getLiveWorkoutData(
          overlayData.rawPoints || [],
          currentWorkoutOffset,
          {
            units: "metric"
          }
        );

        // Draw overlay HUD
        drawVideoOverlay(ctx, {
          dimensions: dims,
          layout: options.layout,
          liveData,
          overlayData,
          metrics: options.metrics,
          videoTimeSec: clipElapsed,
          clipDurationSec: clipDuration,
          introCard: options.introCard,
          outroCard: options.outroCard,
          dimming: options.dimming,
          showBranding: options.showBranding,
          showSafeZones: false
        });

        // Calculate progress & ETA
        const progressPct = Math.min(100, Math.max(0, (clipElapsed / clipDuration) * 100));
        const elapsedRealSec = (performance.now() - exportStartTime) / 1000;
        const estimatedTotalSec = progressPct > 5 ? (elapsedRealSec / (progressPct / 100)) : clipDuration;
        const estimatedRemainingSec = Math.max(0, Math.round(estimatedTotalSec - elapsedRealSec));

        if (onProgress) {
          onProgress({
            progress: Math.round(progressPct),
            currentSec: clipElapsed,
            totalSec: clipDuration,
            estimatedRemainingSec: estimatedRemainingSec > 0 ? estimatedRemainingSec : undefined
          });
        }

        animFrameId = requestAnimationFrame(renderFrame);
      };

      animFrameId = requestAnimationFrame(renderFrame);
    };

    videoElement.addEventListener("seeked", onSeeked);
  });
}
