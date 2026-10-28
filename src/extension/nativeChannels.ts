import { CHANNEL_ID_PATTERN } from './trackDetails.ts';

// The artists seen on Japanese titles, remembered across sessions. One track proves a title is
// Japanese; the artist's other songs (titled in Latin letters, so nothing says so) are only treated as
// Japanese after a second, different track, so a Western artist on one Japanese song is not caught.

export const NATIVE_CHANNELS_KEY = 'nativeChannels';

const TRACKS_NEEDED = 2;
const CHANNEL_LIMIT = 500;
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

export interface ChannelRecord {
  /** Tracks of this channel seen with a Japanese title, up to what is needed. */
  videos: string[];
  seenAt: number;
}

export type NativeChannels = Record<string, ChannelRecord>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What storage holds: anything unexpected is dropped. */
export function parseNativeChannels(raw: unknown): NativeChannels {
  const channels: NativeChannels = {};
  if (!isRecord(raw)) return channels;

  for (const [channelId, record] of Object.entries(raw)) {
    if (!CHANNEL_ID_PATTERN.test(channelId) || !isRecord(record)) continue;
    if (!Array.isArray(record.videos) || typeof record.seenAt !== 'number' || !Number.isFinite(record.seenAt)) continue;

    const videos = record.videos
      .filter((id): id is string => typeof id === 'string' && VIDEO_ID_PATTERN.test(id))
      .slice(0, TRACKS_NEEDED);
    if (videos.length > 0) channels[channelId] = { videos, seenAt: record.seenAt };
  }
  return channels;
}

/** The channels seen on enough Japanese titles to be treated as Japanese. */
export function confirmedChannels(channels: NativeChannels): string[] {
  return Object.entries(channels)
    .filter(([, record]) => record.videos.length >= TRACKS_NEEDED)
    .map(([channelId]) => channelId);
}

/** The same object when there is nothing new to remember, so callers can tell by identity. */
export function recordChannel(
  channels: NativeChannels,
  channelId: string,
  videoId: string,
  now: number,
): NativeChannels {
  const record = channels[channelId];
  if (record && (record.videos.includes(videoId) || record.videos.length >= TRACKS_NEEDED)) return channels;

  const next = { ...channels, [channelId]: { videos: [...(record?.videos ?? []), videoId], seenAt: now } };
  const overflow = Object.keys(next).length - CHANNEL_LIMIT;
  if (overflow > 0) {
    const oldest = Object.entries(next)
      .sort(([, a], [, b]) => a.seenAt - b.seenAt)
      .slice(0, overflow);
    for (const [id] of oldest) delete next[id];
  }
  return next;
}

/** `[channelId, videoId]` pairs the page script noted, as the attribute carries them. */
export function parseLearned(attribute: string | null): [string, string][] {
  if (!attribute) return [];

  let value: unknown;
  try {
    value = JSON.parse(attribute);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];

  const pairs: [string, string][] = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [channelId, videoId] = entry as unknown[];
    if (
      typeof channelId === 'string' &&
      CHANNEL_ID_PATTERN.test(channelId) &&
      typeof videoId === 'string' &&
      VIDEO_ID_PATTERN.test(videoId)
    ) {
      pairs.push([channelId, videoId]);
    }
  }
  return pairs;
}

/** The channel IDs the content script hands to the page script; null while it has not yet. */
export function parseChannelList(attribute: string | null): Set<string> | null {
  if (attribute === null) return null;

  try {
    const value: unknown = JSON.parse(attribute);
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((id): id is string => typeof id === 'string' && CHANNEL_ID_PATTERN.test(id)));
  } catch {
    return new Set();
  }
}
