import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** LatidosVE — icono: latido (ECG) con acento amarillo (Venezuela). */
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="64" y1="48" x2="448" y2="464" gradientUnits="userSpaceOnUse">
      <stop stop-color="#e11d48"/>
      <stop offset="1" stop-color="#9f1239"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <path
    fill="none"
    stroke="#ffffff"
    stroke-width="30"
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M88 300h72l44-108 52 188 44-88 48 8h84"
  />
  <circle cx="204" cy="192" r="22" fill="#fbbf24"/>
  <path
    fill="#ffffff"
    opacity="0.25"
    d="M256 380c-48 0-86-38-86-86s38-86 86-86 86 38 86 86-38 86-86 86z"
  />
</svg>`;

const outDir = join(process.cwd(), "public", "icons");

async function generate() {
  await mkdir(outDir, { recursive: true });

  const sizes = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const { name, size } of sizes) {
    const buffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    await writeFile(join(outDir, name), buffer);
    console.log(`Generated ${name}`);
  }

  await writeFile(join(outDir, "icon.svg"), svg.trim());
  console.log("Generated icon.svg");
}

generate().catch(console.error);
