import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDiagnostics } from './diagnostics.ts';
import type { Status } from './status.ts';
import { DEFAULT_SETTINGS } from '../shared/settings.ts';

const status: Status = {
  settings: DEFAULT_SETTINGS,
  host: 'connected',
  hostError: null,
  discordConnected: true,
  now: {
    title: 'Lycoris',
    artist: 'auritni',
    artistUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
    albumUrl: null,
    artworkUrl: 'https://img/1',
    button: { label: 'Play', url: 'https://music.youtube.com/watch?v=abc' },
    startTimestampMs: 1000,
    endTimestampMs: 2000,
    paused: false,
    statusText: 'app',
  },
  shown: true,
  buttonLanguage: 'vi',
  tabs: 1,
  version: '0.1.0',
};
const env = { userAgent: 'Mozilla/5.0 TestBrowser/1.0', browserLanguage: 'vi-VN' };

test('formatDiagnostics reports the version, browser and connection state', () => {
  const text = formatDiagnostics(status, env);

  assert.match(text, /Version: 0\.1\.0/);
  assert.match(text, /Browser: Mozilla\/5\.0 TestBrowser\/1\.0/);
  assert.match(text, /Browser language: vi-VN/);
  assert.match(text, /Native host: connected/);
  assert.match(text, /Discord: connected/);
  assert.match(text, /YouTube Music tabs: 1/);
});

test('formatDiagnostics lists every setting', () => {
  const text = formatDiagnostics(status, env);

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    assert.ok(text.includes(`${key}: ${String(value)}`), key);
  }
  assert.match(text, /Button language in use: vi/);
});

test('formatDiagnostics describes what is playing and which links exist, not the links themselves', () => {
  const text = formatDiagnostics(status, env);

  assert.match(text, /Now playing: Lycoris — auritni \(playing\)/);
  assert.match(text, /Shown on Discord: yes/);
  assert.match(text, /Artist link: yes/);
  assert.match(text, /Album link: no/);
  assert.match(text, /Play button: yes/);
  assert.ok(!text.includes('UCvG6SZfCwSCCjifUpGHw1EA'));
});

test('formatDiagnostics says so when nothing is playing', () => {
  const text = formatDiagnostics({ ...status, now: null, shown: false }, env);

  assert.match(text, /Now playing: nothing/);
  assert.match(text, /Shown on Discord: no/);
  assert.ok(!text.includes('Artist link'));
});

test('formatDiagnostics includes the native host error and a not-connected Discord', () => {
  const text = formatDiagnostics(
    { ...status, host: 'unavailable', hostError: 'Specified native messaging host not found.', discordConnected: false },
    env,
  );

  assert.match(text, /Native host: unavailable \(Specified native messaging host not found\.\)/);
  assert.match(text, /Discord: not connected/);
});

test('formatDiagnostics marks a paused track', () => {
  const paused = { ...status.now!, paused: true };

  assert.match(formatDiagnostics({ ...status, now: paused }, env), /Lycoris — auritni \(paused\)/);
});
