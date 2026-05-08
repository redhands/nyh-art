import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourceUrl = "https://img.nyh-art.com/ocean/2023-10-03-Cx7axmaOa1e.jpg";
const outputPath = path.join(rootDir, "assets", "social-card.jpg");
const width = 1200;
const height = 630;

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch social card source: HTTP ${response.status}`);
}

const source = Buffer.from(await response.arrayBuffer());
const background = await sharp(source)
  .resize(width, height, { fit: "cover" })
  .blur(18)
  .modulate({ brightness: 0.9, saturation: 0.85 })
  .toBuffer();
const foreground = await sharp(source)
  .resize({ height: 590, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 92, progressive: true })
  .toBuffer();
const foregroundMetadata = await sharp(foreground).metadata();
const left = Math.round((width - foregroundMetadata.width) / 2);
const top = Math.round((height - foregroundMetadata.height) / 2);

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(background)
  .composite([
    {
      input: foreground,
      left,
      top
    }
  ])
  .jpeg({ quality: 90, progressive: true })
  .toFile(outputPath);

console.log(`Generated ${outputPath}`);
