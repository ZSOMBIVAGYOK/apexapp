import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../public/icons');

fs.mkdirSync(outputDir, { recursive: true });

function createPng(width, height, r, g, b) {
  // Simple uncompressed or deflate PNG generator
  const buffer = Buffer.alloc(8 + 25 + (height * (1 + width * 4)) + 12);
  
  // PNG signature
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with scanlines
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      // Draw circular badge or apex peak
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.44;

      if (dist < radius) {
        // Inside circle: gradient / brand color
        const normY = y / height;
        const curR = Math.min(255, Math.floor(r + normY * 30));
        const curG = Math.min(255, Math.floor(g + normY * 40));
        const curB = Math.min(255, Math.floor(b + normY * 30));
        
        // Simple peak/triangle highlight in center
        const inPeak = y > height * 0.3 && y < height * 0.7 && Math.abs(x - width / 2) < (y - height * 0.3) * 0.6;
        if (inPeak) {
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 240;
        } else {
          rawData[offset++] = curR;
          rawData[offset++] = curG;
          rawData[offset++] = curB;
          rawData[offset++] = 255;
        }
      } else {
        // Transparent or dark background
        rawData[offset++] = 11;
        rawData[offset++] = 15;
        rawData[offset++] = 25;
        rawData[offset++] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ihdrChunk,
    idatChunk,
    iendChunk
  ]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
  }
  table[i] = c >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcTarget);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Generate icons
fs.writeFileSync(path.join(outputDir, 'icon-192x192.png'), createPng(192, 192, 34, 197, 94));
fs.writeFileSync(path.join(outputDir, 'icon-512x512.png'), createPng(512, 512, 34, 197, 94));
fs.writeFileSync(path.resolve(__dirname, '../public/favicon.ico'), createPng(64, 64, 34, 197, 94));
fs.writeFileSync(path.resolve(__dirname, '../public/apple-touch-icon.png'), createPng(180, 180, 34, 197, 94));

console.log('PWA icons successfully generated in public/icons/ and public/');
