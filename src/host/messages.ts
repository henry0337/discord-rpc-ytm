import type { ExtensionToHost, Track, TrackButton } from '../shared/protocol.ts';
import type { StatusText } from '../shared/settings.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const INVALID = Symbol('invalid');

// Absent or null means "no button"; anything else must be a labelled https link.
function parseButton(value: unknown): TrackButton | null | typeof INVALID {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) return INVALID;

  const { label, url } = value;
  if (typeof label !== 'string' || label === '') return INVALID;
  if (typeof url !== 'string' || !url.startsWith('https://')) return INVALID;
  return { label, url };
}

// Absent or null means "no link"; anything else must be an https link.
function parseLink(value: unknown): string | null | typeof INVALID {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' && value.startsWith('https://') ? value : INVALID;
}

// A missing timestamp means "no progress bar".
function parseTimestamp(value: unknown): number | null | typeof INVALID {
  if (value === undefined || value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : INVALID;
}

function parseStatusText(value: unknown): StatusText | typeof INVALID {
  if (value === undefined) return 'app';
  return value === 'app' || value === 'title' || value === 'artist' ? value : INVALID;
}

function parseTrack(value: unknown): Track | null {
  if (!isRecord(value)) return null;
  const { title, artist, artworkUrl } = value;

  if (typeof title !== 'string' || typeof artist !== 'string') return null;
  if (artworkUrl !== null && typeof artworkUrl !== 'string') return null;
  if (value.paused !== undefined && typeof value.paused !== 'boolean') return null;
  const button = parseButton(value.button);
  const artistUrl = parseLink(value.artistUrl);
  const albumUrl = parseLink(value.albumUrl);
  const startTimestampMs = parseTimestamp(value.startTimestampMs);
  const endTimestampMs = parseTimestamp(value.endTimestampMs);
  const statusText = parseStatusText(value.statusText);
  if (
    button === INVALID ||
    artistUrl === INVALID ||
    albumUrl === INVALID ||
    startTimestampMs === INVALID ||
    endTimestampMs === INVALID ||
    statusText === INVALID
  ) {
    return null;
  }

  return {
    title,
    artist,
    artistUrl,
    albumUrl,
    artworkUrl,
    button,
    startTimestampMs,
    endTimestampMs,
    paused: value.paused === true,
    statusText,
  };
}

/** Validates a decoded native message; returns null for anything the host does not understand. */
export function parseExtensionMessage(value: unknown): ExtensionToHost | null {
  if (!isRecord(value)) return null;

  if (value.type === 'clear') return { type: 'clear' };
  if (value.type === 'setTrack') {
    const track = parseTrack(value.track);
    return track ? { type: 'setTrack', track } : null;
  }
  return null;
}
