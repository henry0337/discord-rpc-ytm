import { playButtonLabel } from '../shared/i18n.ts';
import type { TrackButton } from '../shared/protocol.ts';

// The ID is read from the page and ends up in a link other people can click, so only the exact
// shape of a YouTube video ID is accepted.
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

/** The "Play on YouTube Music (Web)" button, or null when the video ID is unknown. */
export function buildPlayButton(videoId: string | null, locale: string): TrackButton | null {
  if (videoId === null || !isVideoId(videoId)) return null;
  return {
    label: playButtonLabel(locale),
    url: `https://music.youtube.com/watch?v=${videoId}`,
  };
}
