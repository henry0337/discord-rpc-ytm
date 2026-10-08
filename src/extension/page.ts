import { mayCarryCredit } from './credit.ts';
import { AD_ATTRIBUTE, DETAILS_ATTRIBUTE, VIDEO_ID_ATTRIBUTE } from './pageAttributes.ts';
import { parseTrackDetails, type TrackDetails } from './trackDetails.ts';

// Runs in the page's own JavaScript world (manifest `world: "MAIN"`): the player API and the
// page's session are only reachable from there, not from the isolated world the content script
// lives in. Results are handed over through DOM attributes, which both worlds can see.

interface PlayerApi {
  getVideoData?: () => { video_id?: string } | undefined;
  classList: DOMTokenList;
}

interface YtConfig {
  get?: (key: string) => unknown;
}

const POLL_MS = 500;
const FETCH_TIMEOUT_MS = 5000;
const FAILURE_BACKOFF_MS = 30_000;
const CACHE_LIMIT = 50;
const FALLBACK_CONTEXT = {
  client: { clientName: 'WEB_REMIX', clientVersion: '1.20250310.01.00' },
};

const cache = new Map<string, TrackDetails>();
const failedAt = new Map<string, number>();
const fetching = new Set<string>();

function player(): PlayerApi | null {
  return document.getElementById('movie_player') as PlayerApi | null;
}

function readVideoId(): string | null {
  const fromPlayer = player()?.getVideoData?.()?.video_id;
  if (fromPlayer) return fromPlayer;
  // Only /watch pages carry ?v=, so this is a fallback and not the primary source.
  return new URL(location.href).searchParams.get('v');
}

function setAttribute(name: string, value: string | null): void {
  const root = document.documentElement;
  if (value === null) root.removeAttribute(name);
  else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
}

interface InnertubeContext {
  client?: Record<string, unknown>;
}

/** The page's own request context, optionally asking for another interface language. */
function requestContext(language?: string): InnertubeContext {
  const ytcfg = (window as unknown as { ytcfg?: YtConfig }).ytcfg;
  const context = (ytcfg?.get?.('INNERTUBE_CONTEXT') as InnertubeContext | undefined) ?? FALLBACK_CONTEXT;
  if (!language) return context;
  return { ...context, client: { ...context.client, hl: language } };
}

// The same endpoint the player uses to describe a track: it lists every artist with its channel
// and the album, which the media session does not.
async function fetchNext(videoId: string, language?: string): Promise<TrackDetails | null> {
  try {
    const response = await fetch('/youtubei/v1/next?prettyPrint=false', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: requestContext(language), videoId }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return response.ok ? parseTrackDetails(await response.json(), videoId) : null;
  } catch {
    return null;
  }
}

async function fetchDetails(videoId: string): Promise<TrackDetails | null> {
  const details = await fetchNext(videoId);
  if (!details || details.credit || !details.title || !mayCarryCredit(details.title)) return details;

  // The credit is worded in the interface language ("cùng với", "avec"...), which cannot be read
  // reliably. In English it is always "(feat. NAMES)", so ask for that and read the credit there.
  const english = await fetchNext(videoId, 'en');
  return { ...details, credit: english?.credit ?? null };
}

function remember(videoId: string, details: TrackDetails): void {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(videoId, details);
}

function ensureDetails(videoId: string): void {
  if (cache.has(videoId) || fetching.has(videoId)) return;
  const failedRecently = Date.now() - (failedAt.get(videoId) ?? -Infinity) < FAILURE_BACKOFF_MS;
  if (failedRecently) return;

  fetching.add(videoId);
  void fetchDetails(videoId).then((details) => {
    fetching.delete(videoId);
    if (details) remember(videoId, details);
    else failedAt.set(videoId, Date.now());
    tick();
  });
}

function tick(): void {
  try {
    const videoId = readVideoId();
    setAttribute(VIDEO_ID_ATTRIBUTE, videoId);
    setAttribute(AD_ATTRIBUTE, player()?.classList.contains('ad-showing') ? '1' : null);

    if (videoId === null) {
      setAttribute(DETAILS_ATTRIBUTE, null);
      return;
    }
    ensureDetails(videoId);

    // A failed lookup is reported as "no artists known" so the content script stops waiting and
    // falls back to the media session instead of showing nothing.
    const details =
      cache.get(videoId) ??
      (failedAt.has(videoId) ? { videoId, title: null, artists: [], albumId: null, credit: null } : undefined);
    setAttribute(DETAILS_ATTRIBUTE, details ? JSON.stringify(details) : null);
  } catch {
    // The player can be mid-initialisation; try again on the next poll.
  }
}

setInterval(tick, POLL_MS);
