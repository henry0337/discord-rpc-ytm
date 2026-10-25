// Messages exchanged between the extension background script and the native host.

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
  /** Where clicking the artwork leads: the playlist whose name is shown, else the album page, when there is one. */
  imageUrl: string | null;
  artworkUrl: string | null;
  /** Shown when hovering the artwork: the playlist being played from if a person made it, else the album's name. */
  imageText: string | null;
  button: TrackButton | null;
  /** Epoch ms at which the track (virtually) started, i.e. now - position. Null: no progress bar. */
  startTimestampMs: number | null;
  /** Epoch ms at which the track will end. Null: no progress bar. */
  endTimestampMs: number | null;
  /** Shown as paused: a progress bar would keep running, so it is left out. */
  paused: boolean;
}

export type ExtensionToHost = { type: 'setTrack'; track: Track } | { type: 'clear' };

export type HostToExtension =
  | { type: 'hello'; version: string }
  | { type: 'discord'; connected: boolean };
