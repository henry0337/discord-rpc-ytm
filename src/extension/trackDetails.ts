import { parseCredit, type Credit } from './credit.ts';

// What YouTube Music's `next` endpoint says about a track: every artist (with a channel link when
// there is one) and the album. The media session only offers a flat, localised string such as
// "A, B và C", which cannot be split reliably or linked.

export interface TrackArtist {
  name: string;
  /** Channel ID, or null when the artist has no channel page. */
  channelId: string | null;
}

export interface TrackDetails {
  videoId: string;
  /**
   * The title the player bar shows. The media session can carry another one (for a Japanese song,
   * the Latin title instead of "ひとひら - Hitohira"), so this one wins when present.
   */
  title: string | null;
  artists: TrackArtist[];
  /** Album browse ID, or null for tracks without an album (user uploads, music videos...). */
  albumId: string | null;
  /** Who YouTube Music says is featured, when the title says so in a form that can be read. */
  credit: Credit | null;
}

const CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/;
const ALBUM_ID_PATTERN = /^MPREb_[\w-]+$/;
const ALBUM_PAGE_TYPE = 'MUSIC_PAGE_TYPE_ALBUM';

export function channelUrl(channelId: string): string {
  return `https://music.youtube.com/channel/${channelId}`;
}

export function albumUrl(albumId: string): string {
  return `https://music.youtube.com/browse/${albumId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findRenderer(node: unknown, videoId: string): Record<string, unknown> | null {
  if (!isRecord(node) && !Array.isArray(node)) return null;
  if (isRecord(node) && node.videoId === videoId && isRecord(node.longBylineText)) return node;

  for (const child of Object.values(node)) {
    const found = findRenderer(child, videoId);
    if (found) return found;
  }
  return null;
}

/** A title is a list of text runs; blank means the renderer has none. */
function parseTitle(title: unknown): string | null {
  if (!isRecord(title) || !Array.isArray(title.runs)) return null;
  const text = title.runs
    .map((run) => (isRecord(run) && typeof run.text === 'string' ? run.text : ''))
    .join('')
    .trim();
  return text === '' ? null : text;
}

interface Run {
  text: string;
  browseId: string | null;
  pageType: string | null;
}

function toRun(raw: unknown): Run | null {
  if (!isRecord(raw) || typeof raw.text !== 'string') return null;

  const navigation = isRecord(raw.navigationEndpoint) ? raw.navigationEndpoint : {};
  const endpoint = isRecord(navigation.browseEndpoint) ? navigation.browseEndpoint : {};
  const configs = isRecord(endpoint.browseEndpointContextSupportedConfigs)
    ? endpoint.browseEndpointContextSupportedConfigs
    : {};
  const music = isRecord(configs.browseEndpointContextMusicConfig)
    ? configs.browseEndpointContextMusicConfig
    : {};

  return {
    text: raw.text,
    browseId: typeof endpoint.browseId === 'string' ? endpoint.browseId : null,
    pageType: typeof music.pageType === 'string' ? music.pageType : null,
  };
}

/**
 * The byline reads "Artist, Artist & Artist • Album • Year". Everything before the first bullet is
 * the artists, alternating with separator runs whose wording depends on the interface language, so
 * artists are told apart by position rather than by text.
 */
export function parseTrackDetails(response: unknown, videoId: string): TrackDetails | null {
  const renderer = findRenderer(response, videoId);
  const rawRuns = isRecord(renderer?.longBylineText) ? renderer.longBylineText.runs : undefined;
  if (!Array.isArray(rawRuns)) return null;

  const runs = rawRuns.map(toRun).filter((run): run is Run => run !== null);
  const firstBullet = runs.findIndex((run) => run.text.trim() === '•');
  const artistRuns = (firstBullet === -1 ? runs : runs.slice(0, firstBullet)).filter(
    (_run, index) => index % 2 === 0,
  );

  const artists = artistRuns
    .filter((run) => run.text.trim() !== '')
    .map((run) => ({
      name: run.text,
      channelId: run.browseId !== null && CHANNEL_ID_PATTERN.test(run.browseId) ? run.browseId : null,
    }));
  const albumRun = runs.find(
    (run) => run.pageType === ALBUM_PAGE_TYPE && run.browseId !== null && ALBUM_ID_PATTERN.test(run.browseId),
  );

  const title = parseTitle(renderer?.title);
  return {
    videoId,
    title,
    artists,
    albumId: albumRun?.browseId ?? null,
    credit: title === null ? null : parseCredit(title),
  };
}

/**
 * The page-world script passes the details to the content script through a DOM attribute, which
 * the page itself could also write, so everything is re-validated here.
 */
function sanitizeCredit(value: unknown): Credit | null {
  if (!isRecord(value) || typeof value.baseTitle !== 'string' || value.baseTitle.trim() === '') return null;
  if (!Array.isArray(value.names)) return null;

  const names = value.names
    .filter((name): name is string => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name !== '');
  return names.length > 0 ? { baseTitle: value.baseTitle, names } : null;
}

export function parseDetailsAttribute(raw: string | null): TrackDetails | null {
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.videoId !== 'string' || !Array.isArray(value.artists)) {
    return null;
  }

  const artists: TrackArtist[] = [];
  for (const entry of value.artists) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || entry.name === '') continue;
    const channelId =
      typeof entry.channelId === 'string' && CHANNEL_ID_PATTERN.test(entry.channelId)
        ? entry.channelId
        : null;
    artists.push({ name: entry.name, channelId });
  }
  const albumId =
    typeof value.albumId === 'string' && ALBUM_ID_PATTERN.test(value.albumId) ? value.albumId : null;

  const title = typeof value.title === 'string' && value.title.trim() !== '' ? value.title : null;

  return { videoId: value.videoId, title, artists, albumId, credit: sanitizeCredit(value.credit) };
}
