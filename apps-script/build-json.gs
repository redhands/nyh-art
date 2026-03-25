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
    description: galleryMeta.description,
    total: artworks.length,
    order: galleryMeta.order || "",
    thumbnailSize: galleryMeta.thumbnailSize || "default",
    artworks: artworks
  };
}

function buildArtworkObject(galleryFolder, pair, metadata, artworkIndex, imageUrl) {
  const imageName = pair.imageName;

  return {
    fileName: imageName,
    imagePath: galleryFolder.name + "/" + imageName,
    imageUrl: imageUrl,
    folder: galleryFolder.name,
    title: metadata.attributes.title || buildFallbackTitle(artworkIndex),
    subtitle: metadata.attributes.subtitle || buildFallbackSubtitle(artworkIndex),
    description: metadata.attributes.description || metadata.body || defaultArtworkDescription(),
    medium: metadata.attributes.medium || "",
    size: metadata.attributes.size || "",
    year: metadata.attributes.year || ""
  };
}
