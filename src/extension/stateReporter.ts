import type { PlayerState } from './playerState.ts';

/** Sent by the content script to the background script. */
export interface StateMessage {
  type: 'state';
  state: PlayerState | null;
}

export interface StateReporterOptions {
  /** How many consecutive observations of a changed state are needed before reporting it. */
  stableTicks: number;
  /** While playing, re-report at least this often so the background can recover lost state. */
  heartbeatMs: number;
  /** A start timestamp that moves further than this means the user seeked. */
  seekToleranceMs: number;
}

function keyOf(state: PlayerState | null): string {
  if (state === null) return 'null';
  return JSON.stringify([
    state.title,
    state.titleWithoutCredit,
    state.credits,
    state.artist,
    state.artistChannelId,
    state.albumId,
    state.artworkUrl,
    state.videoId,
    state.playing,
  ]);
}

/**
 * Turns the stream of observations (one per tick) into the few messages worth sending.
 * YouTube Music updates metadata and the video element at slightly different moments when the
 * track changes, so changes must hold steady for a few ticks before they are reported.
 */
export class StateReporter {
  private readonly options: StateReporterOptions;
  private lastSent: PlayerState | null = null;
  private lastSentAt = 0;
  private candidateKey: string | undefined;
  private candidateCount = 0;

  constructor(options: StateReporterOptions) {
    this.options = options;
  }

  observe(state: PlayerState | null, now: number): StateMessage | undefined {
    const key = keyOf(state);
    if (key === this.candidateKey) {
      this.candidateCount++;
    } else {
      this.candidateKey = key;
      this.candidateCount = 1;
    }

    if (key !== keyOf(this.lastSent)) {
      if (this.candidateCount < this.options.stableTicks) return undefined;
      return this.send(state, now);
    }

    if (state === null || !state.playing) return undefined;
    const last = this.lastSent as PlayerState;
    const sought =
      Math.abs(state.startTimestampMs - last.startTimestampMs) > this.options.seekToleranceMs;
    const heartbeatDue = now - this.lastSentAt >= this.options.heartbeatMs;
    return sought || heartbeatDue ? this.send(state, now) : undefined;
  }

  private send(state: PlayerState | null, now: number): StateMessage {
    this.lastSent = state;
    this.lastSentAt = now;
    return { type: 'state', state };
  }
}
