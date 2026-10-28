// The wording of the activity lives here so that what Discord shows (built by the host) and what
// the popup previews can never drift apart.

import type { TrackButton } from './protocol.ts';

const APP_NAME = 'YouTube Music';

// The playback icons are served from this repository, the same way Discord loads the artwork: by URL.
const ICON_BASE = 'https://raw.githubusercontent.com/henry0337/discord-rpc-ytm/master/assets';

/** The small icon at the corner of the artwork: pause while playing is stopped, else play. */
export function playbackIconUrl(paused: boolean): string {
  return `${ICON_BASE}/${paused ? 'pause' : 'play'}.png`;
}

/** The second button, on every activity: a link to this project. The label is the English one. */
export const REPOSITORY_BUTTON: TrackButton = {
  label: 'GitHub Repository',
  url: 'https://github.com/henry0337/discord-rpc-ytm',
};

/** The buttons of an activity, in the order Discord shows them (it allows two). */
export function activityButtons(play: TrackButton | null, repositoryLabel: string | null): TrackButton[] {
  const repository = { ...REPOSITORY_BUTTON, label: repositoryLabel ?? REPOSITORY_BUTTON.label };
  return play ? [play, repository] : [repository];
}

/**
 * The "Listening to …" line of the profile card. Discord always fills in the name of the
 * application, which is set in the Developer Portal and is not part of the activity.
 */
export const HEADER_LINE = `Listening to ${APP_NAME}`;
