// One-off script to rasterize the brand SVGs into PNG icons for PWA install.
// Run with: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'icons');
await mkdir(publicDir, { recursive: true });

async function rasterize(svgName, sizes) {
    const svg = await readFile(join(publicDir, svgName));
    for (const { name, size, bg } of sizes) {
        const buf = await sharp(svg, { density: 384 })
            .resize(size, size, { fit: 'contain', background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } })
            .png({ compressionLevel: 9 })
            .toBuffer();
        await writeFile(join(publicDir, name), buf);
        console.log(`✓ ${name} (${size}x${size}, ${(buf.length / 1024).toFixed(1)} KB)`);
    }
}

// Standard icon (192 + 512)
await rasterize('icon-base.svg', [
    { name: 'icon-192.png', size: 192 },
    { name: 'apple-touch-icon.png', size: 180 },
]);

await rasterize('icon-base-512.svg', [
    { name: 'icon-512.png', size: 512 },
    { name: 'maskable-icon-512.png', size: 512 },
]);

console.log('Done.');
