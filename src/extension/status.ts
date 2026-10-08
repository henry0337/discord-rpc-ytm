import type { Track } from '../shared/protocol.ts';
import type { Settings } from '../shared/settings.ts';

/** `idle`: nothing is playing so the host was not started; `unavailable`: it could not be started. */
export type HostStatus = 'idle' | 'connected' | 'unavailable';

export interface Status {
  settings: Settings;
  host: HostStatus;
  hostError: string | null;
  discordConnected: boolean;
  /** What the browser is playing, whether or not it is shown on Discord (paused and off included). */
  now: Track | null;
  /** Whether Discord is currently showing it. */
  shown: boolean;
  /** Code of the language the play button uses once "automatic" is resolved. */
  buttonLanguage: string;
  /** Number of YouTube Music tabs that reported in. */
  tabs: number;
  version: string;
}

/** Messages the popup sends to the background script. */
export type PopupMessage = { type: 'getStatus' } | { type: 'setSettings'; patch: Partial<Settings> };
