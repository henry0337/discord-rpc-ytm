import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayButton } from './playButton.ts';
import { playButtonLabel } from '../shared/i18n.ts';

test('buildPlayButton links to the track on YouTube Music with a localised label', () => {
  assert.deepEqual(buildPlayButton('dQw4w9WgXcQ', 'vi-VN'), {
    label: playButtonLabel('vi'),
    url: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  });
});

test('buildPlayButton falls back to the English label for an unsupported locale', () => {
  assert.equal(buildPlayButton('dQw4w9WgXcQ', 'xx')?.label, 'Play on YouTube Music (Web)');
});

test('buildPlayButton returns null when the video ID is unknown', () => {
  assert.equal(buildPlayButton(null, 'en'), null);
});

test('buildPlayButton rejects anything that is not an 11-character video ID', () => {
  const bad = [
    '',
    'short',
    'dQw4w9WgXcQx',
    'dQw4w9WgXc/',
    'dQw4w9WgX&q',
    'javascript:1',
    'dQw4w9 gXcQ',
  ];

  for (const id of bad) {
    assert.equal(buildPlayButton(id, 'en'), null, JSON.stringify(id));
  }
});
