import type { Track } from './protocol.ts';

// The wording of the activity lives here so that what Discord shows (built by the host) and what
// the popup previews can never drift apart.

const APP_NAME = 'YouTube Music';

/** The second line of the activity: the artists, prefixed while paused. */
export function stateLine(track: Track): string {
  if (!track.paused) return track.artist;
  return track.artist ? `Paused · ${track.artist}` : 'Paused';
}

/**
 * The "Listening to …" line of the profile card. Discord always fills in the name of the
 * application, which is set in the Developer Portal and is not part of the activity.
 */
export const HEADER_LINE = `Listening to ${APP_NAME}`;
