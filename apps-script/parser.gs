function parseTextMetadata(content) {
  const normalized = String(content || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { attributes: {}, body: "" };
  }

  const sections = normalized.split(/\n\s*\n/);
  const attributes = {};
  const headerLines = sections[0].split("\n");

  headerLines.forEach(function(line) {
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

  return {
    attributes: attributes,
    body: sections.slice(1).join("\n\n").trim()
  };
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
