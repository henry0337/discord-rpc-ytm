import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEADER_LINE, playbackIconUrl } from './display.ts';

test('the playback icon is the pause icon while paused and the play icon otherwise', () => {
  assert.match(playbackIconUrl(true), /^https:\/\/.+\/assets\/pause\.png$/);
  assert.match(playbackIconUrl(false), /^https:\/\/.+\/assets\/play\.png$/);
});

test('the header line always names the application, as Discord does', () => {
  assert.equal(HEADER_LINE, 'Listening to YouTube Music');
});
