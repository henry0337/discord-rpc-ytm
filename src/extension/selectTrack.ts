import type { Track } from '../shared/protocol.ts';
import type { Settings } from '../shared/settings.ts';
import { originalTitle } from './originalTitle.ts';
import { playbackLabel } from '../shared/i18n.ts';
import { buildPlayButton } from './playButton.ts';
import type { PlayerState } from './playerState.ts';
import { albumUrl, channelUrl, playlistUrl } from './trackDetails.ts';

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
 * Picks what to show on Discord: the most recently updated playing tab, else the most recently
 * paused one (shown with a pause icon), else nothing. `locale` decides the
 * language of the "Play on YouTube Music" button and of the playback icon's hover text.
 */
export function selectTrack(
  entries: Iterable<TabEntry>,
  settings: Settings,
  locale: string,
): Track | null {
  if (!settings.enabled) return null;

  const all = [...entries];
  const chosen = mostRecent(all.filter((entry) => entry.state.playing)) ?? mostRecent(all);
  if (!chosen) return null;

  const {
    title,
    titleWithoutCredit,
    credits,
    artist,
    artistChannelId,
    albumId,
    collectionName,
    playlistId,
    artworkUrl,
    videoId,
    startTimestampMs,
    endTimestampMs,
    playing,
  } = chosen.state;
  // The credit leaves the title and its names join the artist line.
  return {
    title: originalTitle(titleWithoutCredit ?? title),
    artist: [artist, ...credits].filter(Boolean).join(', '),
    artistUrl: artistChannelId ? channelUrl(artistChannelId) : null,
    // The link follows the name shown on hover: the playlist being played from, else the album.
    imageUrl: playlistId ? playlistUrl(playlistId) : albumId ? albumUrl(albumId) : null,
    artworkUrl,
    imageText: collectionName,
    playbackText: playbackLabel(locale, !playing),
    button: buildPlayButton(videoId, locale),
    // A paused track gets no progress bar: Discord would keep counting up.
    startTimestampMs: playing ? startTimestampMs : null,
    endTimestampMs: playing ? endTimestampMs : null,
    paused: !playing,
  };
}
