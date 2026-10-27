/** Identificador de vídeo de YouTube: 11 caracteres alfanuméricos, guion o guion bajo. */
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const SHORT_HOST = 'youtu.be';
const PATH_ID_PREFIXES = new Set(['embed', 'shorts', 'live']);

/**
 * Extrae el identificador de un vídeo de YouTube.
 * Acepta el ID suelto o una URL de youtube.com (watch, embed, shorts, live) o youtu.be.
 * Devuelve null si la entrada no corresponde a un vídeo de YouTube.
 */
export function parseYouTubeId(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;
  if (YOUTUBE_ID_PATTERN.test(value)) return value;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  const [first, second] = url.pathname.split('/').filter(Boolean);
  let candidate = null;

  if (host === SHORT_HOST) {
    candidate = first;
  } else if (WATCH_HOSTS.has(host)) {
    if (first === 'watch') candidate = url.searchParams.get('v');
    else if (PATH_ID_PREFIXES.has(first)) candidate = second;
  }

  return candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
}

/** Miniatura pública de un vídeo de YouTube. */
export const youTubeThumbnailUrl = (youtubeId) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
