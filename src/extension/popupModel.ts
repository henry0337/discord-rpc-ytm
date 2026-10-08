import { LANGUAGES } from '../shared/i18n.ts';
import { headerLine, stateLine } from '../shared/display.ts';
import type { Track, TrackButton } from '../shared/protocol.ts';
import { AUTO_LANGUAGE } from '../shared/settings.ts';
import type { Status } from './status.ts';

// Everything the popup decides about what to show lives here, as plain data, so it can be tested
// without a browser. popup.ts only turns this into DOM.

export type Tone = 'ok' | 'warn' | 'bad' | 'off';

export interface Pill {
  tone: Tone;
  text: string;
}

export interface Banner {
  tone: 'bad' | 'warn';
  title: string;
  body: string;
  /** A command the user can copy to fix the problem. */
  command: string | null;
  /** Technical detail, such as the browser's error message. */
  detail: string | null;
}

/** The "On Discord" card, drawn like the activity other people see. */
export interface Card {
  header: string;
  title: string;
  artist: string;
  artistUrl: string | null;
  artworkUrl: string | null;
  button: TrackButton | null;
  progress: boolean;
  /** Dimmed when Discord is not showing it right now. */
  dim: boolean;
}

export interface PopupModel {
  health: { host: Pill; discord: Pill };
  banner: Banner | null;
  /** Null: nothing is playing. */
  card: Card | null;
  note: string;
  languageRow: boolean;
  languageNote: string;
}

const INSTALL_COMMAND = 'npm run install-host';

function hostPill(status: Status): Pill {
  if (status.host === 'connected') return { tone: 'ok', text: 'Connected' };
  if (status.host === 'unavailable') return { tone: 'bad', text: 'Not found' };
  return { tone: 'off', text: 'Starts with music' };
}

function discordPill(status: Status): Pill {
  if (status.host !== 'connected') return { tone: 'off', text: 'Unknown' };
  return status.discordConnected ? { tone: 'ok', text: 'Connected' } : { tone: 'warn', text: 'Not running' };
}

function bannerFor(status: Status): Banner | null {
  if (status.host === 'unavailable') {
    return {
      tone: 'bad',
      title: 'Helper not found.',
      body: 'The extension needs it to reach Discord.',
      command: INSTALL_COMMAND,
      detail: status.hostError,
    };
  }
  if (status.host === 'connected' && !status.discordConnected) {
    return {
      tone: 'warn',
      title: 'Discord is not running.',
      body: 'Open it and your status appears on its own.',
      command: null,
      detail: null,
    };
  }
  return null;
}

function cardFor(now: Track, shown: boolean): Card {
  return {
    header: headerLine(now),
    title: now.title,
    artist: stateLine(now),
    artistUrl: now.artistUrl,
    artworkUrl: now.artworkUrl,
    button: now.button,
    progress: now.startTimestampMs !== null && now.endTimestampMs !== null,
    dim: !shown,
  };
}

function noteFor(status: Status, now: Track): string {
  if (!status.settings.enabled) return 'Off. Nothing is shown on Discord.';
  if (!status.shown) return 'Paused. Hidden from Discord until you press play.';
  return now.button
    ? 'This is what others see. Discord does not show you your own button.'
    : 'This is what others see.';
}

function languageNoteFor(status: Status): string {
  if (status.settings.language !== AUTO_LANGUAGE) return 'Chosen by you';
  const name = LANGUAGES.find((language) => language.code === status.buttonLanguage)?.name;
  return `Follows your browser (${name ?? status.buttonLanguage})`;
}

export function buildPopupModel(status: Status): PopupModel {
  return {
    health: { host: hostPill(status), discord: discordPill(status) },
    banner: bannerFor(status),
    card: status.now ? cardFor(status.now, status.shown) : null,
    note: status.now ? noteFor(status, status.now) : '',
    languageRow: status.settings.showButton,
    languageNote: languageNoteFor(status),
  };
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`;
}

export interface Progress {
  elapsed: string;
  total: string;
  /** How much of the track has played, from 0 to 1. */
  fraction: number;
}

/** Playback progress at `nowMs`, derived from the timestamps the Discord activity uses. */
export function progressOf(track: Track, nowMs: number): Progress | null {
  if (track.startTimestampMs === null || track.endTimestampMs === null) return null;

  const totalMs = track.endTimestampMs - track.startTimestampMs;
  const elapsedMs = Math.min(Math.max(nowMs - track.startTimestampMs, 0), totalMs);
  return {
    elapsed: formatTime(Math.floor(elapsedMs / 1000)),
    total: formatTime(Math.floor(totalMs / 1000)),
    fraction: totalMs > 0 ? elapsedMs / totalMs : 0,
  };
}
