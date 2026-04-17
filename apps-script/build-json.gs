function buildGalleryPayload(galleries) {
  const total = galleries.reduce(function(sum, gallery) {
    return sum + gallery.total;
  }, 0);

  return {
    generatedAt: new Date().toISOString(),
    total: total,
    galleries: galleries
  };
}

function buildGalleryObject(galleryFolder, galleryMeta, artworks) {
  return {
    slug: galleryFolder.name,
    title: galleryMeta.title,
    titleI18n: galleryMeta.titleI18n || {},
    description: galleryMeta.description,
    descriptionI18n: galleryMeta.descriptionI18n || {},
    total: artworks.length,
    order: galleryMeta.order || "",
    thumbnailSize: galleryMeta.thumbnailSize || "default",
    showInArchive: galleryMeta.showInArchive !== false,
    artworks: artworks
  };
}

function buildArtworkObject(galleryFolder, pair, metadata, artworkIndex, imageUrl) {
  const imageName = pair.imageName;
  const titleI18n = buildLocalizedFieldMap(metadata.attributes, "title");
  const subtitleI18n = buildLocalizedFieldMap(metadata.attributes, "subtitle");
  const descriptionI18n = buildLocalizedFieldMap(metadata.attributes, "description");
  const mediumI18n = buildLocalizedFieldMap(metadata.attributes, "medium");

  return {
    fileName: imageName,
    imagePath: galleryFolder.name + "/" + imageName,
    imageUrl: imageUrl,
    folder: galleryFolder.name,
    title: pickLocalizedValue(titleI18n, metadata.attributes.title || buildFallbackTitle(artworkIndex)),
    titleI18n: titleI18n,
    subtitle: pickLocalizedValue(subtitleI18n, metadata.attributes.subtitle || buildFallbackSubtitle(artworkIndex)),
    subtitleI18n: subtitleI18n,
    description: pickLocalizedValue(
      descriptionI18n,
      metadata.attributes.description || metadata.body || defaultArtworkDescription()
    ),
    descriptionI18n: descriptionI18n,
    medium: pickLocalizedValue(mediumI18n, metadata.attributes.medium || ""),
    mediumI18n: mediumI18n,
    size: metadata.attributes.size || "",
    year: metadata.attributes.year || ""
  };
}
