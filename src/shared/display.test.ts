import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headerLine, stateLine } from './display.ts';
import type { Track } from './protocol.ts';

const track: Track = {
  title: 'Lycoris',
  artist: 'auritni',
  artistUrl: null,
  albumUrl: null,
  artworkUrl: null,
  button: null,
  startTimestampMs: 1000,
  endTimestampMs: 2000,
  paused: false,
  statusText: 'app',
};

test('stateLine is the artist while playing', () => {
  assert.equal(stateLine(track), 'auritni');
});

test('stateLine prefixes Paused for a paused track', () => {
  assert.equal(stateLine({ ...track, paused: true }), 'Paused · auritni');
});

test('stateLine is just Paused when a paused track has no artist', () => {
  assert.equal(stateLine({ ...track, paused: true, artist: '' }), 'Paused');
});

test('stateLine is empty for a playing track without an artist', () => {
  assert.equal(stateLine({ ...track, artist: '' }), '');
});

test('headerLine follows the status text setting, as Discord does next to the name', () => {
  assert.equal(headerLine({ ...track, statusText: 'app' }), 'Listening to YouTube Music');
  assert.equal(headerLine({ ...track, statusText: 'title' }), 'Listening to Lycoris');
  assert.equal(headerLine({ ...track, statusText: 'artist' }), 'Listening to auritni');
});

test('headerLine falls back to the app name when the chosen part is empty', () => {
  assert.equal(headerLine({ ...track, statusText: 'artist', artist: '' }), 'Listening to YouTube Music');
});
