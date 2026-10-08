import type { Track } from '../shared/protocol.ts';
import type { Settings } from '../shared/settings.ts';
import { originalTitle } from './originalTitle.ts';
import { buildPlayButton } from './playButton.ts';
import type { PlayerState } from './playerState.ts';
import { albumUrl, channelUrl } from './trackDetails.ts';

export interface TabEntry {
  state: PlayerState;
  /** When the background script last heard from this tab. */
  updatedAt: number;
}

function mostRecent(entries: TabEntry[]): TabEntry | undefined {
  let best: TabEntry | undefined;
  for (const entry of entries) {
    if (!best || entry.updatedAt > best.updatedAt) best = entry;
  }
  return best;
}

/**
 * Picks what to show on Discord and shapes it by the user's settings: the most recently updated
 * playing tab, else (if asked to) the most recently paused one, else nothing. `locale` decides the
 * language of the "Play on YouTube Music" button.
 */
export function selectTrack(
  entries: Iterable<TabEntry>,
  settings: Settings,
  locale: string,
): Track | null {
  if (!settings.enabled) return null;

  const all = [...entries];
  const chosen =
    mostRecent(all.filter((entry) => entry.state.playing)) ??
    (settings.whenPaused === 'show' ? mostRecent(all) : undefined);
  if (!chosen) return null;

  const {
    title,
    titleWithoutCredit,
    credits,
    artist,
    artistChannelId,
    albumId,
    artworkUrl,
    videoId,
    startTimestampMs,
    endTimestampMs,
    playing,
  } = chosen.state;
  // A paused track gets no progress bar: Discord would keep counting up.
  const withProgress = settings.showProgress && playing;
  // With "original title" on, the credit leaves the title and its names join the artist line.
  const shownTitle = settings.originalTitle ? originalTitle(titleWithoutCredit ?? title) : title;
  const shownArtist = settings.originalTitle ? [artist, ...credits].filter(Boolean).join(', ') : artist;
  return {
    title: shownTitle,
    artist: shownArtist,
    artistUrl: artistChannelId ? channelUrl(artistChannelId) : null,
    albumUrl: albumId ? albumUrl(albumId) : null,
    artworkUrl,
    button: settings.showButton ? buildPlayButton(videoId, locale) : null,
    startTimestampMs: withProgress ? startTimestampMs : null,
    endTimestampMs: withProgress ? endTimestampMs : null,
    paused: !playing,
    statusText: settings.statusText,
  };
}
