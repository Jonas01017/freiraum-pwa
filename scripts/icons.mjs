import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
await mkdir('public/icons', { recursive: true });
const svg = await readFile('public/icon.svg');
for (const [name, size] of [['icon-192',192], ['icon-512',512], ['apple-touch-icon',180]]) {
  await sharp(svg).resize(size,size).flatten({background:'#5B5CE2'}).png().toFile(`public/icons/${name}.png`);
}
const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#5B5CE2"/><path d="M162 261l70 70 132-145" fill="none" stroke="white" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/></svg>');
await sharp(mask).png().toFile('public/icons/maskable-512.png');
