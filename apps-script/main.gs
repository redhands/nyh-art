function runSyncNow() {
  return withSyncLock_(function() {
    return runSyncWithRetries_();
  });
}

function runSyncWithRetries_() {
  const maxAttempts = 3;
  const retryDelayMs = 2000;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logInfo_("runSyncNow attempt started", {
        attempt: attempt,
        maxAttempts: maxAttempts
      });
      return runSync_();
    } catch (error) {
      lastError = error;

      logWarn_("runSyncNow attempt failed", {
        attempt: attempt,
        maxAttempts: maxAttempts,
        message: error && error.message ? error.message : String(error)
      });

      if (attempt === maxAttempts) {
        throw new Error(
          "runSyncNow failed after " + maxAttempts + " attempts: " +
          (error && error.message ? error.message : String(error))
        );
      }

      Utilities.sleep(retryDelayMs * attempt);
    }
  }

  throw lastError;
}

function runSync() {
  return withSyncLock_(function() {
    return runSync_();
  });
}

function withSyncLock_(callback) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error("Sync is already running. Skipping overlapping execution.");
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function runSync_() {
  logInfo_("Sync started");

  const config = getConfig();
  const previousPayload = fetchJsonFromR2(config.r2GalleryJsonPath, config) || { galleries: [] };
  const previousArtworkMap = buildPreviousArtworkMap_(previousPayload);
  const previousGalleryMap = buildPreviousGalleryMap_(previousPayload);
  const previousManifest = normalizeManifest_(loadSyncManifest(config));
  const previousManifestMap = buildManifestMap_(previousManifest);
  const galleries = [];
  const processedGalleryMap = {};
  const currentManifest = [];
  const galleryFolders = listGalleryFolders(config.driveRootFolderId);
  let uploadedAssets = 0;
  let skippedAssets = 0;
  let reusedMetadataAssets = 0;

  logInfo_("Sync configuration ready", {
    galleryJsonPath: config.r2GalleryJsonPath,
    publicBaseUrl: config.r2PublicBaseUrl,
    previousManifestCount: previousManifest.length
  });

  galleryFolders.forEach(function(galleryFolder, galleryIndex) {
    logInfo_("Processing gallery", {
      gallery: galleryFolder.name,
      index: galleryIndex + 1,
      total: galleryFolders.length
    });

    const galleryMeta = readGalleryMetadata(galleryFolder.folder);
    const pairs = listArtworkPairs(galleryFolder.folder);
    const artworks = [];

    pairs.forEach(function(pair, artworkIndex) {
      const imageName = pair.imageName;
      const objectPath = galleryFolder.name + "/" + imageName;
      const previousEntry = previousManifestMap[objectPath];
      const previousArtwork = previousArtworkMap[objectPath] || null;
      const currentEntry = {
        path: objectPath,
        imageFileId: pair.imageFileId || "",
        imageSize: String(pair.imageSize || ""),
        imageUpdatedAt: pair.imageUpdatedAt || "",
        textFileId: pair.textFileId || "",
        textSize: String(pair.textSize || ""),
        textUpdatedAt: pair.textUpdatedAt || ""
      };
      const imageChanged = hasArtworkImageChanged_(previousEntry, currentEntry);
      const metadataChanged = hasArtworkMetadataChanged_(previousEntry, currentEntry);
      let imageUrl = previousArtwork && previousArtwork.imageUrl
        ? previousArtwork.imageUrl
        : config.r2PublicBaseUrl + "/" + objectPath;

      if (imageChanged) {
        const contentType = pair.imageMimeType || guessContentType_(imageName);
        const imageBlob = pair.imageFile.getBlob();
        imageUrl = uploadFileToR2(objectPath, imageBlob, contentType, config);
        uploadedAssets += 1;
      } else {
        skippedAssets += 1;
        logInfo_("Artwork unchanged, skipping upload", {
          path: objectPath,
          imageUpdatedAt: currentEntry.imageUpdatedAt
        });
      }

      currentManifest.push(currentEntry);

      if (!imageChanged && !metadataChanged && previousArtwork) {
        reusedMetadataAssets += 1;
        artworks.push({
          ...previousArtwork,
          imageUrl: imageUrl
        });
        return;
      }

      artworks.push(
        buildArtworkObject(
          galleryFolder,
          pair,
          readArtworkMetadata(pair),
          artworkIndex,
          imageUrl
        )
      );
    });

    if (!galleryMeta.order) {
      galleryMeta.order = String(galleryIndex + 1);
    }

    const galleryObject = buildGalleryObject(galleryFolder, galleryMeta, artworks);
    galleries.push(galleryObject);
    processedGalleryMap[galleryFolder.name] = galleryObject;

    logInfo_("Gallery processed", {
      gallery: galleryFolder.name,
      artworks: artworks.length
    });

    persistProgress_(config, previousPayload, previousGalleryMap, processedGalleryMap, currentManifest, previousManifest);
  });

  galleries.sort(compareGalleries_);

  const removedEntries = previousManifest.filter(function(entry) {
    return !currentManifest.some(function(current) { return current.path === entry.path; });
  });
  const removedAssets = removedEntries.length;

  removedEntries.forEach(function(entry) {
    deleteFileFromR2(entry.path, config);
  });

  removeStaleSeriesJsonFiles_(previousGalleryMap, galleries, config);

  logInfo_("Uploading gallery JSON", {
    path: config.r2GalleryJsonPath,
    galleries: galleries.length
  });

  const payload = buildGalleryPayload(galleries);
  uploadGalleryJsonFiles_(payload, config);
  setSyncState(new Date().toISOString(), currentManifest, config);

  Logger.log(JSON.stringify({
    galleries: galleries.length,
    artworks: payload.total,
    uploadedAssets: uploadedAssets,
    skippedAssets: skippedAssets,
    reusedMetadataAssets: reusedMetadataAssets,
    removedAssets: removedAssets,
    galleryJsonPath: config.r2GalleryJsonPath
  }, null, 2));

  logInfo_("Sync finished", {
    galleries: galleries.length,
    artworks: payload.total,
    uploadedAssets: uploadedAssets,
    skippedAssets: skippedAssets,
    reusedMetadataAssets: reusedMetadataAssets,
    removedAssets: removedAssets
  });

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
        imageFileId: "",
        imageSize: "",
        imageUpdatedAt: "",
        textFileId: "",
        textSize: "",
        textUpdatedAt: ""
      };
    }

    return {
      path: entry.path || "",
      imageFileId: entry.imageFileId || "",
      imageSize: entry.imageSize || "",
      imageUpdatedAt: entry.imageUpdatedAt || "",
      textFileId: entry.textFileId || "",
      textSize: entry.textSize || "",
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

function buildPreviousGalleryMap_(payload) {
  const galleries = Array.isArray(payload.galleries) ? payload.galleries : [];

  return galleries.reduce(function(map, gallery) {
    if (gallery.slug) {
      map[gallery.slug] = gallery;
    }
    return map;
  }, {});
}

function buildPreviousArtworkMap_(payload) {
  const galleries = Array.isArray(payload.galleries) ? payload.galleries : [];

  return galleries.reduce(function(map, gallery) {
    const artworks = Array.isArray(gallery.artworks) ? gallery.artworks : [];
    artworks.forEach(function(artwork) {
      if (artwork.imagePath) {
        map[artwork.imagePath] = artwork;
      }
    });
    return map;
  }, {});
}

function persistProgress_(config, previousPayload, previousGalleryMap, processedGalleryMap, currentManifest, previousManifest) {
  const interimPayload = buildInterimPayload_(previousPayload, previousGalleryMap, processedGalleryMap);
  const interimManifest = buildInterimManifest_(currentManifest, previousManifest, processedGalleryMap);

  uploadGalleryJsonFiles_(interimPayload, config);
  setSyncState(new Date().toISOString(), interimManifest, config);

  logInfo_("Progress persisted", {
    galleries: interimPayload.galleries.length,
    artworks: interimPayload.total,
    processedGalleries: Object.keys(processedGalleryMap).length
  });
}

function buildInterimPayload_(previousPayload, previousGalleryMap, processedGalleryMap) {
  const previousGalleries = Array.isArray(previousPayload.galleries) ? previousPayload.galleries : [];
  const mergedGalleries = previousGalleries.map(function(gallery) {
    return processedGalleryMap[gallery.slug] || gallery;
  });

  Object.keys(processedGalleryMap).forEach(function(slug) {
    if (!previousGalleryMap[slug]) {
      mergedGalleries.push(processedGalleryMap[slug]);
    }
  });

  mergedGalleries.sort(compareGalleries_);

  return buildGalleryPayload(mergedGalleries);
}

function uploadGalleryJsonFiles_(payload, config) {
  uploadJsonToR2(config.r2GalleryJsonPath, payload, config);
  uploadJsonToR2(config.r2HomeJsonPath, buildHomeGalleryData(payload), config);

  const galleries = Array.isArray(payload.galleries) ? payload.galleries : [];
  galleries.forEach(function(gallery) {
    uploadJsonToR2(
      config.r2SeriesJsonPrefix + gallery.slug + ".json",
      buildSeriesGalleryData(payload, gallery.slug),
      config
    );
  });
}

function removeStaleSeriesJsonFiles_(previousGalleryMap, galleries, config) {
  const currentGalleryMap = galleries.reduce(function(map, gallery) {
    map[gallery.slug] = true;
    return map;
  }, {});

  Object.keys(previousGalleryMap).forEach(function(slug) {
    if (currentGalleryMap[slug]) {
      return;
    }

    deleteFileFromR2(config.r2SeriesJsonPrefix + slug + ".json", config);
  });
}

function buildInterimManifest_(currentManifest, previousManifest, processedGalleryMap) {
  const processedGalleryNames = Object.keys(processedGalleryMap);
  const previousRemaining = previousManifest.filter(function(entry) {
    return processedGalleryNames.indexOf(getGallerySlugFromPath_(entry.path)) === -1;
  });

  return previousRemaining.concat(currentManifest);
}

function getGallerySlugFromPath_(path) {
  return String(path || "").split("/")[0] || "";
}

function compareGalleries_(left, right) {
  const leftOrder = Number(left.order);
  const rightOrder = Number(right.order);

  if (isFinite(leftOrder) && isFinite(rightOrder) && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title);
}

function hasArtworkImageChanged_(previousEntry, currentEntry) {
  if (!previousEntry) {
    return true;
  }

  return (
    previousEntry.path !== currentEntry.path ||
    previousEntry.imageFileId !== currentEntry.imageFileId ||
    previousEntry.imageSize !== currentEntry.imageSize ||
    previousEntry.imageUpdatedAt !== currentEntry.imageUpdatedAt
  );
}

function hasArtworkMetadataChanged_(previousEntry, currentEntry) {
  if (!previousEntry) {
    return true;
  }

  return (
    previousEntry.textFileId !== currentEntry.textFileId ||
    previousEntry.textSize !== currentEntry.textSize ||
    previousEntry.textUpdatedAt !== currentEntry.textUpdatedAt
  );
}
