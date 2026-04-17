function listGalleryFolders(rootFolderId) {
  const root = DriveApp.getFolderById(rootFolderId);
  const iterator = root.getFolders();
  const folders = [];

  while (iterator.hasNext()) {
    const folder = iterator.next();
    if (folder.isTrashed && folder.isTrashed()) {
      continue;
    }

    folders.push({
      id: folder.getId(),
      name: folder.getName(),
      folder: folder
    });
  }

  folders.sort(function(left, right) {
    return left.name.localeCompare(right.name);
  });

  logInfo_("Drive gallery folders loaded", {
    rootFolderId: rootFolderId,
    count: folders.length
  });

  return folders;
}

function readTextFileFromFolder(folder, fileName) {
  const iterator = folder.getFilesByName(fileName);
  if (!iterator.hasNext()) {
    return "";
  }

  return iterator.next().getBlob().getDataAsString("utf-8");
}

function readGalleryMetadata(folder) {
  const parsed = parseTextMetadata(readTextFileFromFolder(folder, "artworks.txt"));
  const showInArchiveValue = String(parsed.attributes.showInArchive || "true").trim().toLowerCase();
  const metadata = {
    title: parsed.attributes.gallery || parsed.attributes.title || folder.getName(),
    description: parsed.body || "",
    order: parsed.attributes.order || "",
    thumbnailSize: parsed.attributes.thumbnailSize || "default",
    showInArchive: ["false", "0", "no", "off"].indexOf(showInArchiveValue) === -1
  };

  logInfo_("Gallery metadata loaded", {
    folder: folder.getName(),
    title: metadata.title,
    order: metadata.order || "",
    thumbnailSize: metadata.thumbnailSize,
    showInArchive: metadata.showInArchive
  });

  return metadata;
}

function listArtworkPairs(folder) {
  const iterator = folder.getFiles();
  const pairs = {};

  while (iterator.hasNext()) {
    const file = iterator.next();
    if (file.isTrashed && file.isTrashed()) {
      continue;
    }

    const name = file.getName();

    if (name === "artworks.txt" || name === "README.md") {
      continue;
    }

    const basename = stripExtension_(name);
    const extension = getExtension_(name).toLowerCase();

    if (isImageExtension_(extension)) {
      pairs[basename] = pairs[basename] || { basename: basename };
      pairs[basename].imageFile = file;
      pairs[basename].imageFileId = file.getId();
      pairs[basename].imageName = name;
      pairs[basename].imageSize = file.getSize();
      pairs[basename].imageMimeType = file.getMimeType();
      pairs[basename].imageUpdatedAt = file.getLastUpdated().toISOString();
      continue;
    }

    if (extension === "txt") {
      pairs[basename] = pairs[basename] || { basename: basename };
      pairs[basename].textFile = file;
      pairs[basename].textFileId = file.getId();
      pairs[basename].textName = name;
      pairs[basename].textSize = file.getSize();
      pairs[basename].textUpdatedAt = file.getLastUpdated().toISOString();
    }
  }

  const result = Object.keys(pairs)
    .map(function(key) { return pairs[key]; })
    .filter(function(pair) { return !!pair.imageFile; })
    .sort(function(left, right) {
      return left.basename.localeCompare(right.basename);
    });

  logInfo_("Artwork pairs loaded", {
    folder: folder.getName(),
    artworks: result.length
  });

  return result;
}

function readArtworkMetadata(pair) {
  if (!pair.textFile) {
    logWarn_("Artwork metadata missing text file", {
      imageName: pair.imageName
    });
    return { attributes: {}, body: "" };
  }

  return parseTextMetadata(pair.textFile.getBlob().getDataAsString("utf-8"));
}

function stripExtension_(fileName) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? fileName : fileName.slice(0, index);
}

function getExtension_(fileName) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index + 1);
}

function isImageExtension_(extension) {
  return ["jpg", "jpeg", "png", "webp", "gif", "avif"].indexOf(extension) !== -1;
}
