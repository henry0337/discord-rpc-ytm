import type { TrackDetails } from './trackDetails.ts';

interface ArtworkImage {
  src: string;
  sizes: string;
}

export interface MetadataSnapshot {
  title: string;
  artist: string;
  artwork: ArtworkImage[];
}

export interface PlayerSnapshot {
  metadata: MetadataSnapshot | null;
  video: { currentTime: number; duration: number; paused: boolean } | null;
  /** The ID of the video being played, when the page revealed it. */
  videoId: string | null;
  /** What YouTube Music says about that video; may belong to a previous video while loading. */
  details: TrackDetails | null;
  /** An ad is playing: the media session and the video element then describe the ad. */
  adShowing: boolean;
}

/** What one YouTube Music tab is playing, as reported by its content script. */
export interface PlayerState {
  title: string;
  /** The title with YouTube Music's appended "(feat. …)" credit taken out, when it had one. */
  titleWithoutCredit: string | null;
  /** Credited names that are not already among the artists. */
  credits: string[];
  /** All artists joined with ", ". */
  artist: string;
  /** Channel of the first artist, when it has one. */
  artistChannelId: string | null;
  albumId: string | null;
  artworkUrl: string | null;
  videoId: string | null;
  /** Epoch ms at which the track (virtually) started, i.e. now - position. */
  startTimestampMs: number;
  endTimestampMs: number;
  playing: boolean;
}

function artworkWidth(sizes: string): number {
  return Number.parseInt(sizes, 10) || 0;
}

/** The credited names that the artist list does not already show (comparing without letter case). */
function newCredits(names: string[], artists: string[], mediaSessionArtist: string): string[] {
  const known = artists.map((artist) => artist.toLowerCase());
  const mediaSession = mediaSessionArtist.toLowerCase();
  return names.filter((name) => {
    const lower = name.toLowerCase();
    return !known.includes(lower) && !mediaSession.includes(lower);
  });
}

function largestArtwork(metadata: MetadataSnapshot): string | null {
  let best: ArtworkImage | undefined;
  for (const candidate of metadata.artwork) {
    if (!best || artworkWidth(candidate.sizes) > artworkWidth(best.sizes)) best = candidate;
  }
  return best?.src ?? null;
}

/**
 * Returns null while there is nothing worth showing: an ad is playing, there is no metadata or
 * usable duration yet, or the details of the current video are still being fetched (showing the
 * track now would flash the media session's artist wording before the real artists arrive).
 */
export function toPlayerState(snapshot: PlayerSnapshot, now: number): PlayerState | null {
  const { metadata, video, videoId } = snapshot;
  if (snapshot.adShowing) return null;
  if (!metadata || !metadata.title) return null;
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return null;
  if (videoId !== null && snapshot.details?.videoId !== videoId) return null;

  const artists = videoId !== null ? (snapshot.details?.artists ?? []) : [];
  const startTimestampMs = now - Math.round(video.currentTime * 1000);
  // The details come from the same data as the player bar; the media session can carry another title.
  const detailsTitle = videoId !== null ? snapshot.details?.title : null;
  const credit = videoId !== null ? (snapshot.details?.credit ?? null) : null;
  return {
    title: detailsTitle || metadata.title,
    titleWithoutCredit: credit?.baseTitle ?? null,
    credits: credit
      ? newCredits(credit.names, artists.map((artist) => artist.name), metadata.artist)
      : [],
    artist: artists.length > 0 ? artists.map((a) => a.name).join(', ') : metadata.artist,
    artistChannelId: artists[0]?.channelId ?? null,
    albumId: videoId !== null ? (snapshot.details?.albumId ?? null) : null,
    artworkUrl: largestArtwork(metadata),
    videoId,
    startTimestampMs,
    endTimestampMs: startTimestampMs + Math.round(video.duration * 1000),
    playing: !video.paused,
  };
}
