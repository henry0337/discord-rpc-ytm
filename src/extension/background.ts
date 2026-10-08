import { resolveLanguage } from '../shared/i18n.ts';
import { HOST_NAME, type ExtensionToHost, type HostToExtension } from '../shared/protocol.ts';
import {
  AUTO_LANGUAGE,
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  parseSettings,
  validatePatch,
  type Settings,
} from '../shared/settings.ts';
import { ext } from './api.ts';
import { selectTrack, type TabEntry } from './selectTrack.ts';
import type { PopupMessage, Status } from './status.ts';
import type { StateMessage } from './stateReporter.ts';

const RETRY_DELAY_MS = 15_000;

const tabs = new Map<number, TabEntry>();
let settings: Settings = DEFAULT_SETTINGS;
let port: chrome.runtime.Port | undefined;
let hostConnected = false;
let hostError: string | null = null;
let discordConnected = false;
let lastFailureAt = -Infinity;

// A service worker can be restarted at any time, so settings are re-read on every start.
const ready = ext.storage.local.get(SETTING_KEYS).then((stored) => {
  settings = parseSettings(stored);
});

// Discord does not tell extensions which language it runs in, so follow the browser unless the
// user picked one explicitly.
function locale(): string {
  return settings.language === AUTO_LANGUAGE ? ext.i18n.getUILanguage() : settings.language;
}

function connectHost(): void {
  if (port || Date.now() - lastFailureAt < RETRY_DELAY_MS) return;

  const connection = ext.runtime.connectNative(HOST_NAME);
  port = connection;

  connection.onMessage.addListener((message: HostToExtension) => {
    if (message.type === 'hello') {
      hostConnected = true;
      hostError = null;
    } else if (message.type === 'discord') {
      discordConnected = message.connected;
    }
  });

  connection.onDisconnect.addListener(() => {
    // Chromium reports the reason through runtime.lastError, Firefox through port.error.
    const reason =
      (connection as { error?: { message?: string } }).error?.message ??
      ext.runtime.lastError?.message;
    if (port === connection) {
      port = undefined;
      hostConnected = false;
      discordConnected = false;
      hostError = reason ?? 'The native host stopped unexpectedly';
      lastFailureAt = Date.now();
      setTimeout(sync, RETRY_DELAY_MS);
    }
  });
}

function disconnectHost(): void {
  const connection = port;
  port = undefined;
  hostConnected = false;
  discordConnected = false;
  connection?.disconnect(); // The host exits when stdin closes, which also clears the activity.
}

function currentTrack() {
  return selectTrack(tabs.values(), settings, locale());
}

/** Brings Discord in line with what the YouTube Music tabs are playing right now. */
function sync(): void {
  const track = currentTrack();

  if (!track && tabs.size === 0) {
    disconnectHost();
    return;
  }
  if (!track && !port) return; // Nothing to show and nobody to tell.

  connectHost();
  if (!port) return;

  const message: ExtensionToHost = track ? { type: 'setTrack', track } : { type: 'clear' };
  port.postMessage(message);
}

function status(): Status {
  const hostStatus = hostConnected ? 'connected' : hostError ? 'unavailable' : 'idle';
  // What the browser is playing, regardless of the switches that decide whether Discord shows it.
  const now = selectTrack(tabs.values(), { ...settings, enabled: true, whenPaused: 'show' }, locale());
  return {
    settings,
    host: hostStatus,
    hostError,
    discordConnected,
    now,
    shown: currentTrack() !== null,
    buttonLanguage: resolveLanguage(locale()),
    tabs: tabs.size,
    version: ext.runtime.getManifest().version,
  };
}

function isStateMessage(message: unknown): message is StateMessage {
  return (message as StateMessage | undefined)?.type === 'state';
}

ext.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (isStateMessage(message) && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    void ready.then(() => {
      if (message.state) tabs.set(tabId, { state: message.state, updatedAt: Date.now() });
      else tabs.delete(tabId);
      sync();
    });
    return false;
  }

  const popupMessage = message as PopupMessage;
  if (popupMessage?.type === 'getStatus') {
    void ready.then(() => sendResponse(status()));
    return true;
  }
  if (popupMessage?.type === 'setSettings') {
    void ready.then(async () => {
      const patch = validatePatch(popupMessage.patch);
      settings = { ...settings, ...patch };
      await ext.storage.local.set(patch);
      sync();
      sendResponse(status());
    });
    return true;
  }
  return false;
});

ext.tabs.onRemoved.addListener((tabId) => {
  if (tabs.delete(tabId)) sync();
});
