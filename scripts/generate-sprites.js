import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdr = chunk('IHDR', ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type: none
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const idat = chunk('IDAT', deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const SHIP = [
  '00011000',
  '00011000',
  '00011000',
  '01111110',
  '01111110',
  '11111111',
  '10111101',
  '10000001',
];

const INVADER_A = [
  '00100100',
  '00011000',
  '01111110',
  '11011011',
  '11111111',
  '01100110',
  '10011001',
  '01100110',
];

const INVADER_B = [
  '00100100',
  '00011000',
  '01111110',
  '11011011',
  '11111111',
  '01100110',
  '01100110',
  '10011001',
];

const BULLET_SHAPE = [
  '00011000',
  '00011000',
  '00011000',
  '00011000',
  '00011000',
  '00011000',
  '00011000',
  '00011000',
];

const SPRITES = [
  { bitmap: SHIP, color: [80, 220, 255, 255] },
  { bitmap: INVADER_A, color: [120, 220, 90, 255] },
  { bitmap: INVADER_B, color: [120, 220, 90, 255] },
  { bitmap: BULLET_SHAPE, color: [255, 240, 140, 255] },
  { bitmap: BULLET_SHAPE, color: [255, 90, 90, 255] },
];

const CELL_SIZE = 8;
const ATLAS_WIDTH = CELL_SIZE * SPRITES.length;
const ATLAS_HEIGHT = CELL_SIZE;

const atlas = Buffer.alloc(ATLAS_WIDTH * ATLAS_HEIGHT * 4);

SPRITES.forEach(({ bitmap, color }, spriteIndex) => {
  for (let row = 0; row < CELL_SIZE; row += 1) {
    for (let col = 0; col < CELL_SIZE; col += 1) {
      const on = bitmap[row][col] === '1';
      const x = spriteIndex * CELL_SIZE + col;
      const y = row;
      const pixelIndex = (y * ATLAS_WIDTH + x) * 4;
      if (on) {
        atlas[pixelIndex] = color[0];
        atlas[pixelIndex + 1] = color[1];
        atlas[pixelIndex + 2] = color[2];
        atlas[pixelIndex + 3] = color[3];
      } else {
        atlas[pixelIndex] = 0;
        atlas[pixelIndex + 1] = 0;
        atlas[pixelIndex + 2] = 0;
        atlas[pixelIndex + 3] = 0;
      }
    }
  }
});

const png = encodePNG(ATLAS_WIDTH, ATLAS_HEIGHT, atlas);

const outDir = resolve(__dirname, '../games/invaders/assets');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'sprites.png'), png);

console.log(`Wrote ${ATLAS_WIDTH}x${ATLAS_HEIGHT} sprite atlas to games/invaders/assets/sprites.png`);
