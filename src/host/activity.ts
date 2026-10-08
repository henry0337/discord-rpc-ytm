import type { SetActivity } from '@xhayper/discord-rpc';
import { stateLine } from '../shared/display.ts';
import type { Track } from '../shared/protocol.ts';
import type { StatusText } from '../shared/settings.ts';

const ACTIVITY_TYPE_LISTENING = 2;
const MIN_TEXT_LENGTH = 2;
const MAX_TEXT_LENGTH = 128;
const MAX_BUTTON_LABEL_LENGTH = 32;

// Discord rejects activity text shorter than 2 or longer than 128 characters.
function fitText(text: string): string {
  if (text.length > MAX_TEXT_LENGTH) return text.slice(0, MAX_TEXT_LENGTH - 1) + '…';
  return text.padEnd(MIN_TEXT_LENGTH, '​');
}

// Button labels are capped at 32 characters; count code points so CJK and emoji are not split.
function fitButtonLabel(label: string): string {
  const characters = [...label];
  if (characters.length <= MAX_BUTTON_LABEL_LENGTH) return label;
  return characters.slice(0, MAX_BUTTON_LABEL_LENGTH - 1).join('') + '…';
}

// What Discord shows next to the user's name: the app name, the state line or the details line.
const STATUS_DISPLAY_TYPE: Record<StatusText, 0 | 1 | 2> = { app: 0, artist: 1, title: 2 };

export function buildActivity(track: Track): SetActivity {
  const activity: SetActivity = {
    type: ACTIVITY_TYPE_LISTENING,
    details: fitText(track.title),
    statusDisplayType: STATUS_DISPLAY_TYPE[track.statusText],
  };

  // A progress bar keeps running by itself, so it is only shown while actually playing.
  if (!track.paused && track.startTimestampMs !== null && track.endTimestampMs !== null) {
    activity.startTimestamp = track.startTimestampMs;
    activity.endTimestamp = track.endTimestampMs;
  }

  const state = stateLine(track);
  if (state) activity.state = fitText(state);
  if (track.artist && track.artistUrl) activity.stateUrl = track.artistUrl;
  if (track.artworkUrl) activity.largeImageKey = track.artworkUrl;
  if (track.artworkUrl && track.albumUrl) activity.largeImageUrl = track.albumUrl;
  // largeImageText is left unset on purpose: Discord shows it as a third line under the artist.
  if (track.button) {
    activity.buttons = [{ label: fitButtonLabel(track.button.label), url: track.button.url }];
  }
  return activity;
}
