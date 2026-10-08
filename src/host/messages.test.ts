import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtensionMessage } from './messages.ts';

const validTrack = {
  title: 'Song',
  artist: 'Artist',
  artistUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
  albumUrl: 'https://music.youtube.com/browse/MPREb_nWA3z8K9P9T',
  artworkUrl: 'https://img/1',
  button: { label: 'Play on YouTube Music (Web)', url: 'https://music.youtube.com/watch?v=abc' },
  startTimestampMs: 1000,
  endTimestampMs: 2000,
  paused: false,
  statusText: 'app',
};

test('parseExtensionMessage accepts a clear message', () => {
  assert.deepEqual(parseExtensionMessage({ type: 'clear' }), { type: 'clear' });
});

test('parseExtensionMessage accepts a setTrack message with a valid track', () => {
  const message = { type: 'setTrack', track: validTrack };

  assert.deepEqual(parseExtensionMessage(message), message);
});

test('parseExtensionMessage accepts a track without artwork', () => {
  const message = { type: 'setTrack', track: { ...validTrack, artworkUrl: null } };

  assert.deepEqual(parseExtensionMessage(message), message);
});

test('parseExtensionMessage accepts a track without artist or album links', () => {
  const message = { type: 'setTrack', track: { ...validTrack, artistUrl: null, albumUrl: null } };

  assert.deepEqual(parseExtensionMessage(message), message);
});

test('parseExtensionMessage treats missing artist and album links as no links', () => {
  const { artistUrl: _a, albumUrl: _b, ...withoutLinks } = validTrack;
  const parsed = parseExtensionMessage({ type: 'setTrack', track: withoutLinks });

  assert.deepEqual(parsed, {
    type: 'setTrack',
    track: { ...withoutLinks, artistUrl: null, albumUrl: null },
  });
});

test('parseExtensionMessage rejects artist or album links that are not https links', () => {
  const bad = [5, 'javascript:alert(1)', 'http://music.youtube.com/channel/x', ''];

  for (const value of bad) {
    for (const field of ['artistUrl', 'albumUrl']) {
      const message = { type: 'setTrack', track: { ...validTrack, [field]: value } };
      assert.equal(parseExtensionMessage(message), null, `${field}=${JSON.stringify(value)}`);
    }
  }
});

test('parseExtensionMessage accepts a track without a button', () => {
  const message = { type: 'setTrack', track: { ...validTrack, button: null } };

  assert.deepEqual(parseExtensionMessage(message), message);
});

test('parseExtensionMessage treats a missing button as no button', () => {
  const { button: _button, ...withoutButton } = validTrack;
  const parsed = parseExtensionMessage({ type: 'setTrack', track: withoutButton });

  assert.deepEqual(parsed, { type: 'setTrack', track: { ...withoutButton, button: null } });
});

test('parseExtensionMessage rejects a button that is not a label plus an https link', () => {
  const badButtons = [
    'play',
    { label: 5, url: 'https://music.youtube.com/watch?v=abc' },
    { label: 'Play', url: 5 },
    { label: 'Play', url: 'javascript:alert(1)' },
    { label: 'Play', url: 'http://music.youtube.com/watch?v=abc' },
    { label: '', url: 'https://music.youtube.com/watch?v=abc' },
  ];

  for (const button of badButtons) {
    const message = { type: 'setTrack', track: { ...validTrack, button } };
    assert.equal(parseExtensionMessage(message), null, JSON.stringify(button));
  }
});

test('parseExtensionMessage rejects things that are not messages', () => {
  for (const value of [null, undefined, 42, 'clear', [], {}, { type: 'unknown' }]) {
    assert.equal(parseExtensionMessage(value), null, JSON.stringify(value));
  }
});

test('parseExtensionMessage rejects a setTrack with a malformed track', () => {
  const broken = [
    { type: 'setTrack' },
    { type: 'setTrack', track: null },
    { type: 'setTrack', track: { ...validTrack, title: 5 } },
    { type: 'setTrack', track: { ...validTrack, artist: null } },
    { type: 'setTrack', track: { ...validTrack, startTimestampMs: 'now' } },
    { type: 'setTrack', track: { ...validTrack, endTimestampMs: NaN } },
    { type: 'setTrack', track: { ...validTrack, artworkUrl: 7 } },
  ];

  for (const message of broken) {
    assert.equal(parseExtensionMessage(message), null, JSON.stringify(message));
  }
});

test('parseExtensionMessage accepts a track without timestamps, meaning no progress bar', () => {
  const message = {
    type: 'setTrack',
    track: { ...validTrack, startTimestampMs: null, endTimestampMs: null },
  };

  assert.deepEqual(parseExtensionMessage(message), message);
});

test('parseExtensionMessage accepts every status text and a paused track', () => {
  for (const statusText of ['app', 'title', 'artist']) {
    const message = { type: 'setTrack', track: { ...validTrack, statusText, paused: true } };
    assert.deepEqual(parseExtensionMessage(message), message, statusText);
  }
});

test('parseExtensionMessage defaults a missing paused flag and status text', () => {
  const { paused: _p, statusText: _s, ...older } = validTrack;
  const parsed = parseExtensionMessage({ type: 'setTrack', track: older });

  assert.deepEqual(parsed, { type: 'setTrack', track: { ...older, paused: false, statusText: 'app' } });
});

test('parseExtensionMessage rejects an unknown status text or a non-boolean paused flag', () => {
  for (const patch of [{ statusText: 'everything' }, { paused: 'yes' }]) {
    const message = { type: 'setTrack', track: { ...validTrack, ...patch } };
    assert.equal(parseExtensionMessage(message), null, JSON.stringify(patch));
  }
});
