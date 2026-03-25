function runSyncNow() {
  return runSync();
}

function runSync() {
  const config = getConfig();
  const previousManifest = normalizeManifest_(JSON.parse(config.syncManifestJson || "[]"));
  const previousManifestMap = buildManifestMap_(previousManifest);
  const galleries = [];
  const currentManifest = [];
  const galleryFolders = listGalleryFolders(config.driveRootFolderId);
  let uploadedAssets = 0;

  galleryFolders.forEach(function(galleryFolder, galleryIndex) {
    const galleryMeta = readGalleryMetadata(galleryFolder.folder);
    const pairs = listArtworkPairs(galleryFolder.folder);
    const artworks = [];

    pairs.forEach(function(pair, artworkIndex) {
      const metadata = readArtworkMetadata(pair);
      const imageName = pair.imageName;
      const objectPath = galleryFolder.name + "/" + imageName;
      const contentType = pair.imageFile.getBlob().getContentType() || guessContentType_(imageName);
      const previousEntry = previousManifestMap[objectPath];
      const currentEntry = {
        path: objectPath,
        imageUpdatedAt: pair.imageUpdatedAt || "",
        textUpdatedAt: pair.textUpdatedAt || ""
      };
      let imageUrl = config.r2PublicBaseUrl + "/" + objectPath;

      if (hasArtworkChanged_(previousEntry, currentEntry)) {
        const imageBlob = pair.imageFile.getBlob();
        imageUrl = uploadFileToR2(objectPath, imageBlob, contentType, config);
        uploadedAssets += 1;
      }

      currentManifest.push(currentEntry);
      artworks.push(
        buildArtworkObject(
          galleryFolder,
          pair,
          metadata,
          artworkIndex,
          imageUrl
        )
      );
    });

    if (!galleryMeta.order) {
      galleryMeta.order = String(galleryIndex + 1);
    }

    galleries.push(buildGalleryObject(galleryFolder, galleryMeta, artworks));
  });

  galleries.sort(function(left, right) {
    const leftOrder = Number(left.order);
    const rightOrder = Number(right.order);

    if (isFinite(leftOrder) && isFinite(rightOrder) && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.title.localeCompare(right.title);
  });

  previousManifest
    .filter(function(entry) { return !currentManifest.some(function(current) { return current.path === entry.path; }); })
    .forEach(function(entry) {
      deleteFileFromR2(entry.path, config);
    });

  const payload = buildGalleryPayload(galleries);
  uploadJsonToR2(config.r2GalleryJsonPath, payload, config);
  setSyncState(new Date().toISOString(), currentManifest);

  Logger.log(JSON.stringify({
    galleries: galleries.length,
    artworks: payload.total,
    uploadedAssets: uploadedAssets,
    removedAssets: previousManifest.filter(function(entry) {
      return !currentManifest.some(function(current) { return current.path === entry.path; });
    }).length,
    galleryJsonPath: config.r2GalleryJsonPath
  }, null, 2));

  return payload;
}

function guessContentType_(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif"
  };

  return map[extension] || "application/octet-stream";
}

function normalizeManifest_(manifest) {
  if (!Array.isArray(manifest)) {
    return [];
  }

  return manifest.map(function(entry) {
    if (typeof entry === "string") {
      return {
        path: entry,
        imageUpdatedAt: "",
        textUpdatedAt: ""
      };
    }

    return {
      path: entry.path || "",
      imageUpdatedAt: entry.imageUpdatedAt || "",
      textUpdatedAt: entry.textUpdatedAt || ""
    };
  }).filter(function(entry) {
    return !!entry.path;
  });
}

function buildManifestMap_(manifest) {
  return manifest.reduce(function(map, entry) {
    map[entry.path] = entry;
    return map;
  }, {});
}

function hasArtworkChanged_(previousEntry, currentEntry) {
  if (!previousEntry) {
    return true;
  }

  return previousEntry.imageUpdatedAt !== currentEntry.imageUpdatedAt;
}
