import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const artworksDir = path.join(rootDir, "artworks");
const outputDir = path.join(rootDir, "data");
const outputPath = path.join(outputDir, "gallery.json");
const scriptOutputPath = path.join(outputDir, "gallery-data.js");

const imagePattern = /\.(avif|gif|jpe?g|png|webp)$/i;
const markdownPattern = /\.md$/i;
const defaultDescription =
  "현재 올라간 작품은 10x10 캔버스에 아크릴로 작업한 작품입니다. 이후 다른 크기와 형식의 작품이 추가될 수 있으며, 현재는 임시 아카이브 표기라 실제 작품명과 제작년도 정보가 확정되면 이 데이터만 바꿔서 바로 반영할 수 있습니다.";
const defaultMedium = "아크릴";
const defaultSize = "10x10 캔버스";
const generatedAt = new Date().toISOString();

function buildFallbackTitle(index) {
  return `작품 ${String(index + 1).padStart(2, "0")}`;
}

function buildFallbackSubtitle(index) {
  return `아카이브 ${String(index + 1).padStart(2, "0")}`;
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return { attributes: {}, body: normalized.trim() };
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return { attributes: {}, body: normalized.trim() };
  }

  const rawAttributes = normalized.slice(4, closingIndex).split("\n");
  const body = normalized.slice(closingIndex + 5).trim();
  const attributes = {};

  for (const line of rawAttributes) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key) continue;
    attributes[key] = value;
  }

  return { attributes, body };
}

async function readMarkdownFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    return parseFrontmatter(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { attributes: {}, body: "" };
    }

    throw error;
  }
}

async function readArtworkMarkdown(directoryPath, fileName) {
  const basename = fileName.replace(/\.[^.]+$/, "");
  return readMarkdownFile(path.join(directoryPath, `${basename}.md`));
}

const directoryEntries = await readdir(artworksDir, { withFileTypes: true });
const galleryDirectories = directoryEntries
  .filter((entry) => entry.isDirectory())
  .sort((left, right) => left.name.localeCompare(right.name, "en"));

const galleries = (
  await Promise.all(
  galleryDirectories.map(async (directoryEntry, galleryIndex) => {
    const directoryName = directoryEntry.name;
    const directoryPath = path.join(artworksDir, directoryName);
    const files = await readdir(directoryPath);
    const galleryMarkdown = await readMarkdownFile(path.join(directoryPath, "artworks.md"));
    const galleryMeta = galleryMarkdown.attributes;

    const imageFileNames = files
      .filter((fileName) => imagePattern.test(fileName) && !markdownPattern.test(fileName))
      .sort((left, right) => left.localeCompare(right, "en"));

    const artworks = await Promise.all(
      imageFileNames.map(async (fileName, artworkIndex) => {
        const markdown = await readArtworkMarkdown(directoryPath, fileName);
        const meta = markdown.attributes;

        return {
          fileName,
          imagePath: `${directoryName}/${fileName}`,
          folder: directoryName,
          title: meta.title ?? buildFallbackTitle(artworkIndex),
          subtitle: meta.subtitle ?? buildFallbackSubtitle(artworkIndex),
          description: meta.description || markdown.body || defaultDescription,
          medium: meta.medium || defaultMedium,
          size: meta.size || defaultSize,
          year: meta.year || ""
        };
      })
    );

    return {
      slug: directoryName,
      title: galleryMeta.gallery || galleryMeta.title || directoryName,
      description: galleryMarkdown.body || "",
      total: artworks.length,
      order: galleryMeta.order || String(galleryIndex + 1),
      artworks
    };
  })
  )
)
  .filter((gallery) => gallery.total > 0)
  .sort((left, right) => {
    const leftOrder = Number(left.order);
    const rightOrder = Number(right.order);

    if (Number.isFinite(leftOrder) && Number.isFinite(rightOrder) && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.title.localeCompare(right.title, "ko");
  });

const total = galleries.reduce((sum, gallery) => sum + gallery.total, 0);

await mkdir(outputDir, { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt,
      total,
      galleries
    },
    null,
    2
  )}\n`,
  "utf8"
);

await writeFile(
  scriptOutputPath,
  `window.__NYH_GALLERY__ = ${JSON.stringify(
    {
      generatedAt,
      total,
      galleries
    },
    null,
    2
  )};\n`,
  "utf8"
);

console.log(`Generated ${path.relative(rootDir, outputPath)} with ${total} artworks in ${galleries.length} galleries.`);
