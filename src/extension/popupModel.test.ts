import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPopupModel, progressOf } from './popupModel.ts';
import type { Status } from './status.ts';
import type { Track } from '../shared/protocol.ts';
import { DEFAULT_SETTINGS } from '../shared/settings.ts';

const NOW_MS = 1_700_000_000_000;

const track: Track = {
  title: 'Lycoris',
  artist: 'auritni',
  artistUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
  albumUrl: null,
  artworkUrl: 'https://img/1',
  button: { label: 'Phát trên YouTube Music (Web)', url: 'https://music.youtube.com/watch?v=abc' },
  startTimestampMs: NOW_MS - 72_000,
  endTimestampMs: NOW_MS - 72_000 + 212_000,
  paused: false,
  statusText: 'app',
};

const status: Status = {
  settings: DEFAULT_SETTINGS,
  host: 'connected',
  hostError: null,
  discordConnected: true,
  now: track,
  shown: true,
  buttonLanguage: 'vi',
  tabs: 1,
  version: '0.1.0',
};

test('both connections show as ok when everything works', () => {
  const { health, banner } = buildPopupModel(status);

  assert.deepEqual(health.host, { tone: 'ok', text: 'Connected' });
  assert.deepEqual(health.discord, { tone: 'ok', text: 'Connected' });
  assert.equal(banner, null);
});

test('a missing native host is an error with the command that fixes it, and Discord is unknown', () => {
  const { health, banner } = buildPopupModel({
    ...status,
    host: 'unavailable',
    hostError: 'Specified native messaging host not found.',
    discordConnected: false,
  });

  assert.deepEqual(health.host, { tone: 'bad', text: 'Not found' });
  assert.equal(health.discord.tone, 'off');
  assert.equal(banner?.tone, 'bad');
  assert.equal(banner?.command, 'npm run install-host');
  assert.equal(banner?.detail, 'Specified native messaging host not found.');
});

test('an idle native host is neither good nor bad', () => {
  const { health, banner } = buildPopupModel({ ...status, host: 'idle', discordConnected: false, now: null, shown: false });

  assert.deepEqual(health.host, { tone: 'off', text: 'Starts with music' });
  assert.equal(banner, null);
});

test('Discord not running is a warning', () => {
  const { health, banner } = buildPopupModel({ ...status, discordConnected: false });

  assert.deepEqual(health.discord, { tone: 'warn', text: 'Not running' });
  assert.equal(banner?.tone, 'warn');
  assert.equal(banner?.command, null);
});

test('there is no card when nothing is playing', () => {
  const model = buildPopupModel({ ...status, now: null, shown: false });

  assert.equal(model.card, null);
  assert.equal(model.note, '');
});

test('the card mirrors the Discord activity', () => {
  // `now` is built from the settings, so its status text is the one the user chose.
  const { card } = buildPopupModel({
    ...status,
    settings: { ...DEFAULT_SETTINGS, statusText: 'title' },
    now: { ...track, statusText: 'title' },
  });

  assert.equal(card?.header, 'Listening to Lycoris');
  assert.equal(card?.title, 'Lycoris');
  assert.equal(card?.artist, 'auritni');
  assert.equal(card?.artistUrl, track.artistUrl);
  assert.equal(card?.artworkUrl, 'https://img/1');
  assert.deepEqual(card?.button, track.button);
  assert.equal(card?.dim, false);
  assert.equal(card?.progress, true);
});

test('a paused track shows Paused on the artist line and has no progress bar', () => {
  const paused = { ...track, paused: true, startTimestampMs: null, endTimestampMs: null };
  const { card } = buildPopupModel({ ...status, now: paused });

  assert.equal(card?.artist, 'Paused · auritni');
  assert.equal(card?.progress, false);
});

test('the note explains why the card is dimmed', () => {
  const off = buildPopupModel({ ...status, shown: false, settings: { ...DEFAULT_SETTINGS, enabled: false } });
  const pausedHidden = buildPopupModel({ ...status, shown: false, now: { ...track, paused: true } });

  assert.equal(off.card?.dim, true);
  assert.equal(off.note, 'Off. Nothing is shown on Discord.');
  assert.equal(pausedHidden.card?.dim, true);
  assert.equal(pausedHidden.note, 'Paused. Hidden from Discord until you press play.');
});

test('the note reminds that Discord hides your own button, only when there is one', () => {
  assert.equal(
    buildPopupModel(status).note,
    'This is what others see. Discord does not show you your own button.',
  );
  assert.equal(buildPopupModel({ ...status, now: { ...track, button: null } }).note, 'This is what others see.');
});

test('the language row only matters while the play button is on', () => {
  assert.equal(buildPopupModel(status).languageRow, true);
  assert.equal(
    buildPopupModel({ ...status, settings: { ...DEFAULT_SETTINGS, showButton: false } }).languageRow,
    false,
  );
});

test('the language note names the browser language while automatic, or says the user chose', () => {
  assert.equal(buildPopupModel(status).languageNote, 'Follows your browser (Tiếng Việt)');
  assert.equal(
    buildPopupModel({ ...status, settings: { ...DEFAULT_SETTINGS, language: 'ja' } }).languageNote,
    'Chosen by you',
  );
});

test('progressOf reports elapsed and total time and the fraction played', () => {
  assert.deepEqual(progressOf(track, NOW_MS), { elapsed: '1:12', total: '3:32', fraction: 72 / 212 });
});

test('progressOf stays within the track', () => {
  assert.equal(progressOf(track, NOW_MS - 100_000)?.fraction, 0);
  assert.equal(progressOf(track, NOW_MS + 1_000_000)?.fraction, 1);
  assert.equal(progressOf(track, NOW_MS + 1_000_000)?.elapsed, '3:32');
});

test('progressOf formats long tracks with hours', () => {
  const long = { ...track, startTimestampMs: NOW_MS - 3_725_000, endTimestampMs: NOW_MS + 3_600_000 };

  assert.equal(progressOf(long, NOW_MS)?.elapsed, '1:02:05');
});

test('progressOf is null without timestamps', () => {
  assert.equal(progressOf({ ...track, startTimestampMs: null, endTimestampMs: null }, NOW_MS), null);
});
