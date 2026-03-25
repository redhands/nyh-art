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
    lastSyncAt: props.getProperty("LAST_SYNC_AT") || "",
    syncManifestJson: props.getProperty("SYNC_MANIFEST_JSON") || "[]"
  };
}

function requireProperty_(props, key) {
  const value = props.getProperty(key);
  if (!value) {
    throw new Error("Missing Script Property: " + key);
  }

  return value;
}

function setSyncState(lastSyncAt, manifestRecords) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("LAST_SYNC_AT", lastSyncAt);
  props.setProperty("SYNC_MANIFEST_JSON", JSON.stringify(manifestRecords));
}
