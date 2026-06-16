export const trackUrl = (albumId, trackId) =>
  new URL(`./albums/${albumId}/music/${trackId}.mp3`, import.meta.url).href;
export const coverUrl = (albumId) => new URL(`./albums/${albumId}/cover.jpg`, import.meta.url).href;
