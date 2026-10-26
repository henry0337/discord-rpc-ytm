import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaybackPosition } from './playbackPosition.ts';

const NOW = 1_700_000_000_000;
const reading = (currentTime: number, duration: number, ageMs = 0) =>
  JSON.stringify([currentTime, duration, NOW - ageMs]);

test('parsePlaybackPosition reads the position and the length of the track', () => {
  assert.deepEqual(parsePlaybackPosition(reading(5.5, 39.9), NOW, true), { currentTime: 5.5, duration: 39.9 });
});

test('parsePlaybackPosition moves the reading forward by its age while playing, not while paused', () => {
  assert.deepEqual(parsePlaybackPosition(reading(10, 100, 400), NOW, true), { currentTime: 10.4, duration: 100 });
  assert.deepEqual(parsePlaybackPosition(reading(10, 100, 400), NOW, false), { currentTime: 10, duration: 100 });
});

test('parsePlaybackPosition never goes past the end of the track', () => {
  assert.equal(parsePlaybackPosition(reading(99.9, 100, 400), NOW, true)?.currentTime, 100);
});

test('parsePlaybackPosition has nothing without a reading, or with one that is stale or from the future', () => {
  assert.equal(parsePlaybackPosition(null, NOW, true), null);
  assert.equal(parsePlaybackPosition(reading(10, 100, 6000), NOW, true), null);
  assert.equal(parsePlaybackPosition(reading(10, 100, -1000), NOW, true), null);
});

test('parsePlaybackPosition rejects anything that is not three usable numbers', () => {
  const bad = [
    'not json',
    '{}',
    '[]',
    '[1,2]',
    `[1,2,${NOW},4]`,
    `["1",2,${NOW}]`,
    `[null,2,${NOW}]`,
    `[-1,100,${NOW}]`,
    `[1,0,${NOW}]`,
    `[1,-5,${NOW}]`,
    `[1,null,${NOW}]`,
  ];
  for (const attribute of bad) assert.equal(parsePlaybackPosition(attribute, NOW, true), null, attribute);
});
