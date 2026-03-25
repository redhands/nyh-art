function listGalleryFolders(rootFolderId) {
  const root = DriveApp.getFolderById(rootFolderId);
  const iterator = root.getFolders();
  const folders = [];

  while (iterator.hasNext()) {
    const folder = iterator.next();
    folders.push({
      id: folder.getId(),
      name: folder.getName(),
      folder: folder
    });
  }

  folders.sort(function(left, right) {
    return left.name.localeCompare(right.name);
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
  return {
    title: parsed.attributes.gallery || parsed.attributes.title || folder.getName(),
    description: parsed.body || "",
    order: parsed.attributes.order || "",
    thumbnailSize: parsed.attributes.thumbnailSize || "default"
  };
}

function listArtworkPairs(folder) {
  const iterator = folder.getFiles();
  const pairs = {};

  while (iterator.hasNext()) {
    const file = iterator.next();
    const name = file.getName();

    if (name === "artworks.txt" || name === "README.md") {
      continue;
    }

    const basename = stripExtension_(name);
    const extension = getExtension_(name).toLowerCase();

    if (isImageExtension_(extension)) {
      pairs[basename] = pairs[basename] || { basename: basename };
      pairs[basename].imageFile = file;
      pairs[basename].imageName = name;
      pairs[basename].imageUpdatedAt = file.getLastUpdated().toISOString();
      continue;
    }

    if (extension === "txt") {
      pairs[basename] = pairs[basename] || { basename: basename };
      pairs[basename].textFile = file;
      pairs[basename].textName = name;
      pairs[basename].textUpdatedAt = file.getLastUpdated().toISOString();
    }
  }

  return Object.keys(pairs)
    .map(function(key) { return pairs[key]; })
    .filter(function(pair) { return !!pair.imageFile; })
    .sort(function(left, right) {
      return left.basename.localeCompare(right.basename);
    });
}

function readArtworkMetadata(pair) {
  if (!pair.textFile) {
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
