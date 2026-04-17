import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const targetRoot = "/Users/redhands/Google Drive/내 드라이브/nyh-art";
const locales = ["ko", "en", "ja", "zh"];
const localizableKeys = new Set(["gallery", "title", "subtitle", "description", "medium"]);
const commonKeyOrder = [
  "gallery",
  "title",
  "subtitle",
  "description",
  "medium",
  "size",
  "year",
  "order",
  "thumbnailSize",
  "showInArchive"
];

function detectLocale(value) {
  const text = String(value || "").trim();
  if (!text) return "ko";
  if (/[가-힣]/u.test(text)) return "ko";
  if (/[ぁ-ゟ゠-ヿ]/u.test(text)) return "ja";
  if (/[\u4E00-\u9FFF]/u.test(text)) return "zh";
  if (/[A-Za-z]/u.test(text)) return "en";
  return "ko";
}

function parseTextMetadata(content) {
  const normalized = String(content || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return { attributes: {}, body: "" };

  const sections = normalized.split(/\n\s*\n/);
  const attributes = {};
  const bodySections = [];

  for (const section of sections) {
    const lines = section.split("\n");
    const attributeLines = lines.filter((line) => /^[A-Za-z0-9_.-]+\s*:/u.test(line.trim()));

    if (attributeLines.length === lines.length) {
      for (const line of lines) {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) continue;
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!key) continue;
        attributes[key] = value;
      }
      continue;
    }

    const firstLine = lines[0] || "";
    const separatorIndex = firstLine.indexOf(":");
    if (separatorIndex !== -1) {
      const key = firstLine.slice(0, separatorIndex).trim();
      const firstValue = firstLine.slice(separatorIndex + 1).trim();
      if (/^[A-Za-z0-9_.-]+$/u.test(key)) {
        const remainingLines = lines.slice(1);
        const value = [firstValue]
          .concat(remainingLines)
          .filter((line) => line !== "")
          .join("\n")
          .trim();
        attributes[key] = value;
        continue;
      }
    }

    bodySections.push(section.trim());
  }

  return { attributes, body: bodySections.join("\n\n").trim() };
}

function buildOrderedEntries(attributes, body) {
  const localized = {};
  const common = {};
  const unknown = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (key.includes(".")) {
      const [baseKey, locale] = key.split(".", 2);
      if (localizableKeys.has(baseKey) && locales.includes(locale)) {
        localized[baseKey] ||= {};
        localized[baseKey][locale] = value;
        continue;
      }
    }

    if (localizableKeys.has(key)) {
      const locale = detectLocale(value);
      localized[key] ||= {};
      if (!localized[key][locale]) {
        localized[key][locale] = value;
      }
      continue;
    }

    if (commonKeyOrder.includes(key)) {
      common[key] = value;
    } else {
      unknown[key] = value;
    }
  }

  if (body && !localized.description) {
    localized.description = { [detectLocale(body)]: body };
  }

  const lines = [];
  const pushEntry = (key, value) => {
    if (!String(value || "").includes("\n")) {
      lines.push(`${key}: ${value}`);
      return;
    }

    lines.push(`${key}:`);
    lines.push(String(value).trim());
  };

  for (const key of commonKeyOrder) {
    if (localizableKeys.has(key)) {
      const localizedValues = localized[key];
      if (!localizedValues) continue;
      for (const locale of locales) {
        if (localizedValues[locale]) {
          pushEntry(`${key}.${locale}`, localizedValues[locale]);
        }
      }
      continue;
    }

    if (common[key]) {
      pushEntry(key, common[key]);
    }
  }

  for (const [key, value] of Object.entries(unknown).sort((a, b) => a[0].localeCompare(b[0]))) {
    pushEntry(key, value);
  }

  return lines.join("\n").trim() + "\n";
}

async function collectTxtFiles(root) {
  const entries = await import("node:fs/promises").then(({ readdir }) =>
    readdir(root, { withFileTypes: true })
  );
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTxtFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".txt")) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await collectTxtFiles(targetRoot);
let updatedCount = 0;

for (const file of files) {
  const original = await readFile(file, "utf8");
  const parsed = parseTextMetadata(original);
  const next = buildOrderedEntries(parsed.attributes, parsed.body);
  if (next !== original) {
    await writeFile(file, next, "utf8");
    updatedCount += 1;
  }
}

console.log(`Updated ${updatedCount} txt files in ${targetRoot}`);
