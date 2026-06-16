// Dynamically loaded album data from ./albums folders

import { trackUrl } from './utils.js';

const albumMetaModules = import.meta.glob('./albums/*/album.json', { eager: true });
const tracksModules = import.meta.glob('./albums/*/tracks.json', { eager: true });
const coverModules = import.meta.glob('./albums/*/cover.jpg', { eager: true });

// Build a cover URL map from eagerly imported cover modules.
// Using import.meta.glob ensures cover images are included in the build
// output, unlike runtime new URL(templateLiteral, import.meta.url) which
// Vite cannot resolve at build time.
const coverUrlByAlbum = {};
for (const [path, mod] of Object.entries(coverModules)) {
  const albumId = path.split('/')[2];
  // Convert to absolute URL using import.meta.url's origin.
  // Root-relative URLs (/assets/cover-xxx.jpg) would resolve against the
  // shell's origin (port 4007) when the micro-frontend runs inside it.
  coverUrlByAlbum[albumId] = new URL(mod.default, import.meta.url).href;
}

export const albums = Object.entries(albumMetaModules).map(([path, metaMod]) => {
  const albumId = path.split('/')[2];
  const meta = metaMod.default;
  const tracks = tracksModules[`./albums/${albumId}/tracks.json`].default;
  const enrichedTracks = tracks.map((t) => ({ ...t, url: trackUrl(albumId, t.id) }));
  return {
    id: albumId,
    ...meta,
    tracks: enrichedTracks,
    coverUrl: coverUrlByAlbum[albumId],
  };
});

export const genres = [...new Set(albums.map((a) => a.genre))];
