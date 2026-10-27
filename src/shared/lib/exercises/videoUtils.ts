/**
 * Video URL Parser and Sanitizer
 *
 * Enforces strict HTTPS and CSP-compliant embedding:
 * - YouTube: strictly embedded via https://www.youtube-nocookie.com/embed/{id}
 * - Vimeo: strictly embedded via https://player.vimeo.com/video/{id}
 * - Direct MP4/WebM: rendered natively via HTML5 <video> tag
 * - Other URLs: rendered as safe external link with target="_blank" and rel="noopener noreferrer"
 */

export type VideoType = "youtube" | "vimeo" | "direct" | "external" | "invalid";

export interface ParsedVideo {
  type: VideoType;
  embedUrl?: string;
  directUrl?: string;
  externalUrl?: string;
  videoId?: string;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates whether a URL is a valid, secure HTTPS URL.
 */
export function isValidHttpsUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parses and sanitizes a video link for embedding or external viewing.
 */
export function parseVideoUrl(rawUrl?: string): ParsedVideo {
  if (!rawUrl || !rawUrl.trim()) {
    return { type: "invalid", isValid: false, errorMessage: "Nincs megadva link." };
  }

  const trimmed = rawUrl.trim();

  // Enforce HTTPS
  if (!isValidHttpsUrl(trimmed)) {
    return {
      type: "invalid",
      isValid: false,
      errorMessage: "A videó linknek biztonságos https:// címmel kell kezdődnie."
    };
  }

  try {
    const url = new URL(trimmed);

    // 1. YouTube Detection
    // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
    if (
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtube.com" ||
      url.hostname === "m.youtube.com" ||
      url.hostname === "youtu.be" ||
      url.hostname === "www.youtube-nocookie.com"
    ) {
      let videoId = "";
      if (url.hostname === "youtu.be") {
        videoId = url.pathname.slice(1).split("/")[0] || "";
      } else if (url.pathname.startsWith("/watch")) {
        videoId = url.searchParams.get("v") || "";
      } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/embed/")[1]?.split("/")[0] || "";
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      }

      if (videoId && /^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
        return {
          type: "youtube",
          videoId,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
          isValid: true
        };
      }
    }

    // 2. Vimeo Detection
    // Matches: vimeo.com/ID, player.vimeo.com/video/ID
    if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com" || url.hostname === "player.vimeo.com") {
      let videoId = "";
      if (url.hostname === "player.vimeo.com") {
        videoId = url.pathname.split("/video/")[1]?.split("/")[0] || "";
      } else {
        const segments = url.pathname.split("/").filter(Boolean);
        videoId = segments[segments.length - 1] || "";
      }

      if (videoId && /^\d+$/.test(videoId)) {
        return {
          type: "vimeo",
          videoId,
          embedUrl: `https://player.vimeo.com/video/${videoId}`,
          isValid: true
        };
      }
    }

    // 3. Direct HTML5 Video (.mp4 / .webm)
    const pathnameLower = url.pathname.toLowerCase();
    if (pathnameLower.endsWith(".mp4") || pathnameLower.endsWith(".webm") || pathnameLower.endsWith(".mov")) {
      return {
        type: "direct",
        directUrl: trimmed,
        isValid: true
      };
    }

    // 4. Other safe HTTPS links
    return {
      type: "external",
      externalUrl: trimmed,
      isValid: true
    };
  } catch {
    return {
      type: "invalid",
      isValid: false,
      errorMessage: "Érvénytelen URL formátum."
    };
  }
}
