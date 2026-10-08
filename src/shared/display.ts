import type { Track } from './protocol.ts';

// The wording of the activity lives here so that what Discord shows (built by the host) and what
// the popup previews can never drift apart.

const APP_NAME = 'YouTube Music';

/** The second line of the activity: the artists, prefixed while paused. */
export function stateLine(track: Track): string {
  if (!track.paused) return track.artist;
  return track.artist ? `Paused · ${track.artist}` : 'Paused';
}

/** The "Listening to …" line, whose last part follows the status text setting. */
export function headerLine(track: Track): string {
  const subject =
    track.statusText === 'title' ? track.title : track.statusText === 'artist' ? track.artist : APP_NAME;
  return `Listening to ${subject || APP_NAME}`;
}
