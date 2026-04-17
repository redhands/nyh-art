function parseTextMetadata(content) {
  const normalized = String(content || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { attributes: {}, body: "" };
  }

  const sections = normalized.split(/\n\s*\n/);
  const attributes = {};
  const bodySections = [];

  sections.forEach(function(section) {
    const lines = section.split("\n");
    const attributeLines = lines.filter(function(line) {
      return /^[A-Za-z0-9_.-]+\s*:/u.test(line.trim());
    });

    if (attributeLines.length === lines.length) {
      lines.forEach(function(line) {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) {
          return;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!key) {
          return;
        }

        attributes[key] = value;
      });
      return;
    }

    const firstLine = lines[0] || "";
    const separatorIndex = firstLine.indexOf(":");
    if (separatorIndex !== -1) {
      const key = firstLine.slice(0, separatorIndex).trim();
      const firstValue = firstLine.slice(separatorIndex + 1).trim();

      if (/^[A-Za-z0-9_.-]+$/u.test(key)) {
        const remainingLines = lines.slice(1);
        const value = [firstValue].concat(remainingLines).filter(function(line) {
          return line !== "";
        }).join("\n").trim();
        attributes[key] = value;
        return;
      }
    }

    bodySections.push(section.trim());
  });

  return {
    attributes: attributes,
    body: bodySections.join("\n\n").trim()
  };
}

function buildLocalizedFieldMap(attributes, key) {
  const locales = ["ko", "en", "ja", "zh"];
  const localized = {};

  locales.forEach(function(locale) {
    const localizedKey = key + "." + locale;
    if (attributes[localizedKey]) {
      localized[locale] = attributes[localizedKey];
    }
  });

  if (!Object.keys(localized).length && attributes[key]) {
    localized.ko = attributes[key];
  }

  return localized;
}

function pickLocalizedValue(localizedMap, fallbackValue) {
  if (localizedMap.ko) {
    return localizedMap.ko;
  }

  const locales = Object.keys(localizedMap || {});
  if (locales.length) {
    return localizedMap[locales[0]];
  }

  return fallbackValue || "";
}

function buildFallbackTitle(index) {
  return "작품 " + String(index + 1).padStart(2, "0");
}

function buildFallbackSubtitle(index) {
  return "아카이브 " + String(index + 1).padStart(2, "0");
}

function defaultArtworkDescription() {
  return "설명이 아직 등록되지 않은 작품입니다.";
}
