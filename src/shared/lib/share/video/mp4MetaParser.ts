/**
 * In-browser ISO BMFF (MP4 / QuickTime MOV) metadata parser.
 * Reads atoms (boxes) like 'moov', 'mvhd', 'tkhd' to extract creation date,
 * duration, timescale, and rotation with zero external dependencies.
 */

export interface ParsedVideoMeta {
  creationDate?: Date;
  duration?: number;
  rotation?: number;
  timescale?: number;
}

const QUICKTIME_EPOCH_OFFSET_SECONDS = 2082844800; // Seconds between 1904-01-01 and 1970-01-01 UTC

/**
 * Read a 4-character ASCII box type
 */
function readBoxType(view: DataView, offset: number): string {
  let type = "";
  for (let i = 0; i < 4; i++) {
    type += String.fromCharCode(view.getUint8(offset + i));
  }
  return type;
}

/**
 * Scan a DataView buffer for a 4-character atom type
 */
function findBox(view: DataView, targetType: string, start = 0, end = view.byteLength): number {
  let pos = start;
  while (pos + 8 <= end) {
    const size = view.getUint32(pos);
    const type = readBoxType(view, pos + 4);

    if (type === targetType) {
      return pos;
    }

    if (size === 0) {
      // Box extends to end of buffer
      break;
    } else if (size === 1) {
      // 64-bit size
      if (pos + 16 > end) break;
      const high = view.getUint32(pos + 8);
      const low = view.getUint32(pos + 12);
      const size64 = high * 4294967296 + low;
      if (size64 < 16) break;
      pos += size64;
    } else if (size < 8) {
      // Invalid box size
      pos += 1;
    } else {
      pos += size;
    }
  }

  // Fallback: brute force 4-byte search if top-level traversal missed non-aligned chunk
  for (let i = start; i <= end - 4; i++) {
    if (readBoxType(view, i) === targetType) {
      return i - 4 >= 0 ? i - 4 : i;
    }
  }

  return -1;
}

/**
 * Parse 'mvhd' (Movie Header Box)
 */
function parseMvhd(view: DataView, boxOffset: number): { creationDate?: Date; duration?: number; timescale?: number } {
  try {
    const version = view.getUint8(boxOffset + 8);
    let creationTimeSec = 0;
    let timescale = 0;
    let durationUnits = 0;

    if (version === 0) {
      creationTimeSec = view.getUint32(boxOffset + 12);
      timescale = view.getUint32(boxOffset + 20);
      durationUnits = view.getUint32(boxOffset + 24);
    } else if (version === 1) {
      const high = view.getUint32(boxOffset + 12);
      const low = view.getUint32(boxOffset + 16);
      creationTimeSec = high * 4294967296 + low;
      timescale = view.getUint32(boxOffset + 28);
      const durHigh = view.getUint32(boxOffset + 32);
      const durLow = view.getUint32(boxOffset + 36);
      durationUnits = durHigh * 4294967296 + durLow;
    }

    let creationDate: Date | undefined;
    if (creationTimeSec > QUICKTIME_EPOCH_OFFSET_SECONDS) {
      const unixSec = creationTimeSec - QUICKTIME_EPOCH_OFFSET_SECONDS;
      const d = new Date(unixSec * 1000);
      // Validate that date is reasonably between 2000 and 2100
      if (d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
        creationDate = d;
      }
    }

    const duration = timescale > 0 ? durationUnits / timescale : undefined;

    return { creationDate, duration, timescale };
  } catch {
    return {};
  }
}

/**
 * Parse 'tkhd' (Track Header Box) to extract rotation from transformation matrix
 */
function parseTkhd(view: DataView, boxOffset: number): { rotation?: number } {
  try {
    const version = view.getUint8(boxOffset + 8);
    // Matrix is located at offset 48 for v0, 60 for v1
    const matrixOffset = boxOffset + (version === 0 ? 48 : 60);
    if (matrixOffset + 36 > view.byteLength) return { rotation: 0 };

    // Read 32-bit fixed point 16.16 values
    const a = view.getInt32(matrixOffset) / 65536;
    const b = view.getInt32(matrixOffset + 4) / 65536;
    const c = view.getInt32(matrixOffset + 12) / 65536;
    const d = view.getInt32(matrixOffset + 16) / 65536;

    let rotation = 0;
    if (Math.abs(a) < 0.1 && Math.abs(d) < 0.1) {
      if (b > 0.8 && c < -0.8) {
        rotation = 90;
      } else if (b < -0.8 && c > 0.8) {
        rotation = 270;
      }
    } else if (a < -0.8 && d < -0.8) {
      rotation = 180;
    }

    return { rotation };
  } catch {
    return { rotation: 0 };
  }
}

/**
 * Parse MP4 / QuickTime metadata from an ArrayBuffer
 */
export function parseMp4Buffer(buffer: ArrayBuffer): ParsedVideoMeta {
  const view = new DataView(buffer);
  const result: ParsedVideoMeta = { rotation: 0 };

  const moovPos = findBox(view, "moov");
  if (moovPos === -1) {
    return result;
  }

  // Find mvhd inside or after moov
  const mvhdPos = findBox(view, "mvhd", moovPos);
  if (mvhdPos !== -1) {
    const mvhdData = parseMvhd(view, mvhdPos);
    result.creationDate = mvhdData.creationDate;
    result.duration = mvhdData.duration;
    result.timescale = mvhdData.timescale;
  }

  // Find tkhd
  const tkhdPos = findBox(view, "tkhd", moovPos);
  if (tkhdPos !== -1) {
    const tkhdData = parseTkhd(view, tkhdPos);
    result.rotation = tkhdData.rotation;
  }

  return result;
}

/**
 * Read file header / tail slices to extract MP4 / MOV metadata without loading the full video.
 */
export async function parseMp4File(file: File | Blob): Promise<ParsedVideoMeta> {
  try {
    const headSize = Math.min(file.size, 1024 * 1024 * 2); // 2 MB head
    const headSlice = await file.slice(0, headSize).arrayBuffer();
    const headMeta = parseMp4Buffer(headSlice);

    if (headMeta.creationDate || headMeta.duration) {
      return headMeta;
    }

    // If moov wasn't in head and file is larger than 2MB, check tail
    if (file.size > headSize) {
      const tailSize = Math.min(file.size, 1024 * 1024 * 2); // 2 MB tail
      const tailSlice = await file.slice(file.size - tailSize, file.size).arrayBuffer();
      const tailMeta = parseMp4Buffer(tailSlice);
      return {
        creationDate: tailMeta.creationDate ?? headMeta.creationDate,
        duration: tailMeta.duration ?? headMeta.duration,
        rotation: tailMeta.rotation ?? headMeta.rotation ?? 0,
        timescale: tailMeta.timescale ?? headMeta.timescale
      };
    }

    return headMeta;
  } catch {
    return { rotation: 0 };
  }
}
