function getConfig() {
  const props = PropertiesService.getScriptProperties();

  return {
    driveRootFolderId: requireProperty_(props, "DRIVE_ROOT_FOLDER_ID"),
    r2AccountId: requireProperty_(props, "R2_ACCOUNT_ID"),
    r2BucketName: requireProperty_(props, "R2_BUCKET_NAME"),
    r2AccessKeyId: requireProperty_(props, "R2_ACCESS_KEY_ID"),
    r2SecretAccessKey: requireProperty_(props, "R2_SECRET_ACCESS_KEY"),
    r2PublicBaseUrl: requireProperty_(props, "R2_PUBLIC_BASE_URL").replace(/\/$/, ""),
    r2GalleryJsonPath: props.getProperty("R2_GALLERY_JSON_PATH") || "site-data/gallery.json",
    r2SyncManifestJsonPath: props.getProperty("R2_SYNC_MANIFEST_JSON_PATH") || defaultSyncManifestPath_(props.getProperty("R2_GALLERY_JSON_PATH") || "site-data/gallery.json"),
    lastSyncAt: props.getProperty("LAST_SYNC_AT") || "",
    syncManifestJson: props.getProperty("SYNC_MANIFEST_JSON") || "[]"
  };
}

function defaultSyncManifestPath_(galleryJsonPath) {
  const normalized = String(galleryJsonPath || "site-data/gallery.json");
  const slashIndex = normalized.lastIndexOf("/");
  const prefix = slashIndex === -1 ? "" : normalized.slice(0, slashIndex + 1);
  return prefix + "sync-manifest.json";
}

function requireProperty_(props, key) {
  const value = props.getProperty(key);
  if (!value) {
    throw new Error("Missing Script Property: " + key);
  }

  return value;
}

function loadSyncManifest(config) {
  try {
    const manifest = fetchJsonFromR2(config.r2SyncManifestJsonPath, config);
    if (Array.isArray(manifest)) {
      return manifest;
    }
  } catch (error) {
    logWarn_("Failed to load R2 sync manifest, falling back to Script Property", {
      path: config.r2SyncManifestJsonPath,
      message: error && error.message ? error.message : String(error)
    });
  }

  return JSON.parse(config.syncManifestJson || "[]");
}

function setSyncState(lastSyncAt, manifestRecords, config) {
  const props = PropertiesService.getScriptProperties();
  uploadJsonToR2(config.r2SyncManifestJsonPath, manifestRecords, config);
  props.setProperty("LAST_SYNC_AT", lastSyncAt);
  props.setProperty("R2_SYNC_MANIFEST_JSON_PATH", config.r2SyncManifestJsonPath);
}

function logInfo_(message, data) {
  if (typeof data === "undefined") {
    Logger.log("[INFO] " + message);
    return;
  }

  Logger.log("[INFO] " + message + " | " + JSON.stringify(data));
}

function logWarn_(message, data) {
  if (typeof data === "undefined") {
    Logger.log("[WARN] " + message);
    return;
  }

  Logger.log("[WARN] " + message + " | " + JSON.stringify(data));
}
