import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTrack, type TabEntry } from './selectTrack.ts';
import type { PlayerState } from './playerState.ts';
import { playButtonLabel } from '../shared/i18n.ts';
import { DEFAULT_SETTINGS, type Settings } from '../shared/settings.ts';

const CHANNEL = 'UCvG6SZfCwSCCjifUpGHw1EA';
const ALBUM = 'MPREb_nWA3z8K9P9T';

function state(title: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    title,
    artist: 'Artist',
    artistChannelId: null,
    albumId: null,
    titleWithoutCredit: null,
    credits: [],
    artworkUrl: null,
    videoId: null,
    startTimestampMs: 1000,
    endTimestampMs: 2000,
    playing: true,
    ...overrides,
  };
}

function entry(title: string, updatedAt: number, overrides: Partial<PlayerState> = {}) {
  const tab: TabEntry = { state: state(title, overrides), updatedAt };
  return tab;
}

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

test('selectTrack returns the track of a playing tab without the playing flag or IDs', () => {
  assert.deepEqual(selectTrack([entry('A', 1)], settings(), 'en'), {
    title: 'A',
    artist: 'Artist',
    artistUrl: null,
    albumUrl: null,
    artworkUrl: null,
    button: null,
    startTimestampMs: 1000,
    endTimestampMs: 2000,
    paused: false,
    statusText: 'app',
  });
});

test('selectTrack turns the artist channel and the album into links', () => {
  const entries = [entry('A', 1, { artistChannelId: CHANNEL, albumId: ALBUM })];
  const track = selectTrack(entries, settings(), 'en');

  assert.equal(track?.artistUrl, `https://music.youtube.com/channel/${CHANNEL}`);
  assert.equal(track?.albumUrl, `https://music.youtube.com/browse/${ALBUM}`);
});

test('selectTrack adds a play button localised to the given language when the video ID is known', () => {
  const track = selectTrack([entry('A', 1, { videoId: 'dQw4w9WgXcQ' })], settings(), 'vi');

  assert.deepEqual(track?.button, {
    label: playButtonLabel('vi'),
    url: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  });
});

test('selectTrack leaves the play button out when it is switched off', () => {
  const entries = [entry('A', 1, { videoId: 'dQw4w9WgXcQ' })];

  assert.equal(selectTrack(entries, settings({ showButton: false }), 'en')?.button, null);
});

test('selectTrack leaves the progress bar out when it is switched off', () => {
  const track = selectTrack([entry('A', 1)], settings({ showProgress: false }), 'en');

  assert.equal(track?.startTimestampMs, null);
  assert.equal(track?.endTimestampMs, null);
});

test('selectTrack passes the status text setting on', () => {
  assert.equal(selectTrack([entry('A', 1)], settings({ statusText: 'title' }), 'en')?.statusText, 'title');
});

test('selectTrack shows the original title without the Latin version YouTube Music appends, by default', () => {
  const entries = [entry('ひとひら - Hitohira', 1)];

  assert.equal(selectTrack(entries, settings(), 'en')?.title, 'ひとひら');
});

test('selectTrack keeps the full title when the original title setting is off', () => {
  const entries = [entry('ひとひら - Hitohira', 1)];

  assert.equal(selectTrack(entries, settings({ originalTitle: false }), 'en')?.title, 'ひとひら - Hitohira');
});

const credited = (overrides: Partial<PlayerState> = {}) =>
  entry('ピュア - Pure (cùng với Eriko Hashimoto)', 1, {
    artist: 'PAS TASTA',
    artistChannelId: CHANNEL,
    titleWithoutCredit: 'ピュア - Pure',
    credits: ['Eriko Hashimoto'],
    ...overrides,
  });

test('selectTrack takes the credit out of the title and puts the credited names after the artists', () => {
  const track = selectTrack([credited()], settings(), 'vi');

  assert.equal(track?.title, 'ピュア');
  assert.equal(track?.artist, 'PAS TASTA, Eriko Hashimoto');
});

test('selectTrack keeps linking the first artist when credited names are added', () => {
  const track = selectTrack([credited()], settings(), 'vi');

  assert.equal(track?.artistUrl, `https://music.youtube.com/channel/${CHANNEL}`);
});

test('selectTrack lists every credited name, comma separated', () => {
  const track = selectTrack([credited({ credits: ['A', 'B', 'C'] })], settings(), 'vi');

  assert.equal(track?.artist, 'PAS TASTA, A, B, C');
});

test('selectTrack still removes the credit from the title when its names are already artists', () => {
  const track = selectTrack([credited({ credits: [] })], settings(), 'vi');

  assert.equal(track?.title, 'ピュア');
  assert.equal(track?.artist, 'PAS TASTA');
});

test('selectTrack shows only the credited names when there is no artist', () => {
  const track = selectTrack([credited({ artist: '' })], settings(), 'vi');

  assert.equal(track?.artist, 'Eriko Hashimoto');
});

test('selectTrack leaves the title and the artists exactly as YouTube Music shows them when the original title setting is off', () => {
  const track = selectTrack([credited()], settings({ originalTitle: false }), 'vi');

  assert.equal(track?.title, 'ピュア - Pure (cùng với Eriko Hashimoto)');
  assert.equal(track?.artist, 'PAS TASTA');
});

test('selectTrack prefers the most recently updated playing tab', () => {
  const entries = [entry('Old', 1), entry('New', 5), entry('Middle', 3)];

  assert.equal(selectTrack(entries, settings(), 'en')?.title, 'New');
});

test('selectTrack hides paused tabs by default', () => {
  const entries = [entry('Paused but newer', 9, { playing: false }), entry('Playing', 1)];

  assert.equal(selectTrack(entries, settings(), 'en')?.title, 'Playing');
  assert.equal(selectTrack([entry('A', 1, { playing: false })], settings(), 'en'), null);
});

test('selectTrack keeps the most recent paused tab, marked paused and without progress, when asked to', () => {
  const entries = [entry('Older', 1, { playing: false }), entry('Newer', 5, { playing: false })];
  const track = selectTrack(entries, settings({ whenPaused: 'show' }), 'en');

  assert.equal(track?.title, 'Newer');
  assert.equal(track?.paused, true);
  assert.equal(track?.startTimestampMs, null);
  assert.equal(track?.endTimestampMs, null);
});

test('selectTrack still prefers a playing tab over a paused one when paused tabs are kept', () => {
  const entries = [entry('Paused but newer', 9, { playing: false }), entry('Playing', 1)];

  assert.equal(selectTrack(entries, settings({ whenPaused: 'show' }), 'en')?.title, 'Playing');
});

test('selectTrack returns null when there is nothing to show', () => {
  assert.equal(selectTrack([], settings(), 'en'), null);
  assert.equal(selectTrack([], settings({ whenPaused: 'show' }), 'en'), null);
});

test('selectTrack returns null while the extension is switched off', () => {
  assert.equal(selectTrack([entry('A', 1)], settings({ enabled: false }), 'en'), null);
});
