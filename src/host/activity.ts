import type { SetActivity } from '@xhayper/discord-rpc';
import { activityButtons, playbackIconUrl } from '../shared/display.ts';
import type { Track } from '../shared/protocol.ts';

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

// Discord shows the state line (the artists) next to the user's name; 0 would be the app name and
// 2 the details line (the title).
const STATUS_DISPLAY_ARTIST = 1;

export function buildActivity(track: Track): SetActivity {
  const activity: SetActivity = {
    type: ACTIVITY_TYPE_LISTENING,
    details: fitText(track.title),
    statusDisplayType: STATUS_DISPLAY_ARTIST,
  };

  // A progress bar keeps running by itself, so it is only shown while actually playing.
  if (!track.paused && track.startTimestampMs !== null && track.endTimestampMs !== null) {
    activity.startTimestamp = track.startTimestampMs;
    activity.endTimestamp = track.endTimestampMs;
  }

  if (track.artist) activity.state = fitText(track.artist);
  if (track.artist && track.artistUrl) activity.stateUrl = track.artistUrl;
  if (track.artworkUrl) activity.largeImageKey = track.artworkUrl;
  if (track.artworkUrl && track.imageUrl) activity.largeImageUrl = track.imageUrl;
  // Discord shows this as the hover text of the artwork and, for a Listening activity, also as a third line.
  if (track.artworkUrl && track.imageText) activity.largeImageText = fitText(track.imageText);
  // The corner icon says whether the track plays or is paused; it sits on the artwork, so it needs one.
  if (track.artworkUrl) {
    activity.smallImageKey = playbackIconUrl(track.paused);
    if (track.playbackText) activity.smallImageText = fitText(track.playbackText);
  }
  activity.buttons = activityButtons(track.button, track.repositoryLabel).map((button) => ({
    label: fitButtonLabel(button.label),
    url: button.url,
  }));
  return activity;
}
