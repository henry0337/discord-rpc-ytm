import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEADER_LINE, stateLine } from './display.ts';
import type { Track } from './protocol.ts';

const track: Track = {
  title: 'Lycoris',
  artist: 'auritni',
  artistUrl: null,
  albumUrl: null,
  artworkUrl: null,
  imageText: null,
  button: null,
  startTimestampMs: 1000,
  endTimestampMs: 2000,
  paused: false,
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

test('the header line always names the application, as Discord does', () => {
  assert.equal(HEADER_LINE, 'Listening to YouTube Music');
});
