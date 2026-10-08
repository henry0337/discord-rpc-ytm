import type { SetActivity } from '@xhayper/discord-rpc';
import type { Track } from '../shared/protocol.ts';
import { buildActivity } from './activity.ts';

export interface ActivitySink {
  set(activity: SetActivity): Promise<void>;
  clear(): Promise<void>;
}

export interface PresenceControllerOptions {
  /** Minimum gap between two calls to Discord (it rate-limits activity updates). */
  minIntervalMs: number;
  log: (message: string) => void;
}

// Heartbeats recompute the timestamps from the playback position, so they jitter by a few
// hundred ms. Anything beyond this is treated as a real change (seek, new track).
const TIMESTAMP_TOLERANCE_MS = 2000;

// What Discord currently shows is unknown (never sent, or the last send failed).
const UNKNOWN = Symbol('unknown');
type Applied = Track | null | typeof UNKNOWN;

// A missing timestamp (no progress bar) only matches another missing one.
function sameTimestamp(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < TIMESTAMP_TOLERANCE_MS;
}

function sameDisplay(a: Track, b: Track): boolean {
  return (
    a.title === b.title &&
    a.artist === b.artist &&
    a.artistUrl === b.artistUrl &&
    a.albumUrl === b.albumUrl &&
    a.artworkUrl === b.artworkUrl &&
    a.button?.label === b.button?.label &&
    a.button?.url === b.button?.url &&
    a.paused === b.paused &&
    a.statusText === b.statusText &&
    sameTimestamp(a.startTimestampMs, b.startTimestampMs) &&
    sameTimestamp(a.endTimestampMs, b.endTimestampMs)
  );
}

function inSync(desired: Track | null, applied: Applied): boolean {
  if (applied === UNKNOWN) return false;
  if (desired === null || applied === null) return desired === applied;
  return sameDisplay(desired, applied);
}

/**
 * Keeps Discord's activity matching the latest desired track. It only talks to Discord while
 * connected, throttles updates, and skips updates that would not visibly change anything.
 */
export class PresenceController {
  private desired: Track | null = null;
  private applied: Applied = null;
  private connected = false;
  private lastSentAt = -Infinity;
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly sink: ActivitySink;
  private readonly options: PresenceControllerOptions;

  constructor(sink: ActivitySink, options: PresenceControllerOptions) {
    this.sink = sink;
    this.options = options;
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
    if (connected) {
      this.schedule();
    } else {
      this.applied = UNKNOWN;
      this.cancelTimer();
    }
  }

  setTrack(track: Track | null): void {
    this.desired = track;
    this.schedule();
  }

  private schedule(): void {
    if (!this.connected || inSync(this.desired, this.applied)) return;

    const wait = this.lastSentAt + this.options.minIntervalMs - Date.now();
    if (wait <= 0) {
      this.flush();
    } else if (this.timer === undefined) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.schedule();
      }, wait);
    }
  }

  private flush(): void {
    const target = this.desired;
    this.lastSentAt = Date.now();
    this.applied = target;

    const done = target === null ? this.sink.clear() : this.sink.set(buildActivity(target));
    done.catch((error: unknown) => {
      this.applied = UNKNOWN;
      this.options.log(`Failed to update Discord activity: ${String(error)}`);
    });
  }

  private cancelTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
