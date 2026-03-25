import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const filesToCopy = [
  "index.html",
  "gallery.html",
  "styles.css",
  "script.js"
];

const directoriesToCopy = [
  "assets"
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const file of filesToCopy) {
  await cp(path.join(rootDir, file), path.join(distDir, file));
}

for (const directory of directoriesToCopy) {
  await cp(path.join(rootDir, directory), path.join(distDir, directory), {
    recursive: true
  });
}

console.log("Built deployable site into dist/");
