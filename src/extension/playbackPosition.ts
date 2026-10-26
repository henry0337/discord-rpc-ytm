export interface PlaybackPosition {
  /** Seconds into the current track. */
  currentTime: number;
  /** Length of the current track, in seconds. */
  duration: number;
}

// The page script refreshes the reading every half second; a much older one means it stopped.
const MAX_AGE_MS = 5000;

/**
 * Reads what page.ts took from the player API: `[currentTime, duration, readAt]`. The <video>
 * element cannot be used for this: YouTube Music keeps it running across consecutive tracks, so it
 * reports the sum of their lengths. The reading is moved forward by its age while playing.
 * Returns null when there is no usable reading, and the caller falls back to the element.
 */
export function parsePlaybackPosition(
  attribute: string | null,
  now: number,
  playing: boolean,
): PlaybackPosition | null {
  if (attribute === null) return null;

  let value: unknown;
  try {
    value = JSON.parse(attribute);
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length !== 3) return null;

  const [currentTime, duration, readAt] = value as unknown[];
  if (typeof currentTime !== 'number' || typeof duration !== 'number' || typeof readAt !== 'number') return null;
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || !Number.isFinite(readAt)) return null;
  if (currentTime < 0 || duration <= 0) return null;

  const ageMs = now - readAt;
  if (ageMs < 0 || ageMs > MAX_AGE_MS) return null;

  const elapsed = currentTime + (playing ? ageMs / 1000 : 0);
  return { currentTime: Math.min(elapsed, duration), duration };
}
