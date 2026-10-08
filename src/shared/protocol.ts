// Messages exchanged between the extension background script and the native host.
import type { StatusText } from './settings.ts';

export const HOST_NAME = 'com.ytm_discord_rpc.host';

/** Derived from the `key` in src/extension/manifest.base.json (a test keeps them in sync). */
export const CHROMIUM_EXTENSION_ID = 'pfdhcaephccgapohlbnhceijkkkahknf';
export const GECKO_EXTENSION_ID = 'ytm-discord-rpc@extension';

/** A link button on the Discord activity (other people see it, the user sees their own without it). */
export interface TrackButton {
  label: string;
  url: string;
}

export interface Track {
  title: string;
  /** All artists, already joined for display (e.g. "A, B, C"). */
  artist: string;
  /** Where clicking the artist line leads: the first artist's channel, when it has one. */
  artistUrl: string | null;
  /** Where clicking the artwork leads: the album page, when the track has an album. */
  albumUrl: string | null;
  artworkUrl: string | null;
  button: TrackButton | null;
  /** Epoch ms at which the track (virtually) started, i.e. now - position. Null: no progress bar. */
  startTimestampMs: number | null;
  /** Epoch ms at which the track will end. Null: no progress bar. */
  endTimestampMs: number | null;
  /** Shown as paused: a progress bar would keep running, so it is left out. */
  paused: boolean;
  /** Which part of the activity Discord shows next to the user's name. */
  statusText: StatusText;
}

export type ExtensionToHost = { type: 'setTrack'; track: Track } | { type: 'clear' };

export type HostToExtension =
  | { type: 'hello'; version: string }
  | { type: 'discord'; connected: boolean };
