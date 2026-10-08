import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActivity } from './activity.ts';
import type { Track } from '../shared/protocol.ts';

const track: Track = {
  title: 'Miss You (Sped Up)',
  artist: 'TRVNSPORTER, Narvent, SKVLENT',
  artistUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
  albumUrl: 'https://music.youtube.com/browse/MPREb_nWA3z8K9P9T',
  artworkUrl: 'https://yt3.googleusercontent.com/abc=w544-h544-l90-rj',
  button: { label: 'Phát trên YouTube Music (Web)', url: 'https://music.youtube.com/watch?v=abc' },
  startTimestampMs: 1_000_000,
  endTimestampMs: 1_176_000,
  paused: false,
  statusText: 'app',
};

test('buildActivity shows a Listening activity with clickable artist and artwork, progress bar and button', () => {
  assert.deepEqual(buildActivity(track), {
    type: 2,
    details: 'Miss You (Sped Up)',
    state: 'TRVNSPORTER, Narvent, SKVLENT',
    stateUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
    largeImageKey: 'https://yt3.googleusercontent.com/abc=w544-h544-l90-rj',
    largeImageUrl: 'https://music.youtube.com/browse/MPREb_nWA3z8K9P9T',
    startTimestamp: 1_000_000,
    endTimestamp: 1_176_000,
    statusDisplayType: 0,
    buttons: [
      { label: 'Phát trên YouTube Music (Web)', url: 'https://music.youtube.com/watch?v=abc' },
    ],
  });
});

test('buildActivity never sets the image text, which Discord would show as a third line', () => {
  assert.equal('largeImageText' in buildActivity(track), false);
});

test('buildActivity omits the artwork when the track has none', () => {
  const activity = buildActivity({ ...track, artworkUrl: null });

  assert.equal('largeImageKey' in activity, false);
});

test('buildActivity leaves the artist line unlinked when the artist has no channel', () => {
  const activity = buildActivity({ ...track, artistUrl: null });

  assert.equal(activity.state, 'TRVNSPORTER, Narvent, SKVLENT');
  assert.equal('stateUrl' in activity, false);
});

test('buildActivity leaves the artwork unlinked when there is no album', () => {
  const activity = buildActivity({ ...track, albumUrl: null });

  assert.equal('largeImageUrl' in activity, false);
});

test('buildActivity omits state when the artist is empty', () => {
  const activity = buildActivity({ ...track, artist: '', artistUrl: null });

  assert.equal('state' in activity, false);
});

test('buildActivity omits buttons when the track has no button', () => {
  const activity = buildActivity({ ...track, button: null });

  assert.equal('buttons' in activity, false);
});

test('buildActivity truncates a button label to the 32 characters Discord allows', () => {
  const button = { label: 'x'.repeat(50), url: 'https://music.youtube.com/watch?v=abc' };
  const label = buildActivity({ ...track, button }).buttons?.[0]?.label ?? '';

  assert.equal([...label].length, 32);
  assert.ok(label.endsWith('…'));
});

test('buildActivity pads one-character text to the two characters Discord requires', () => {
  const activity = buildActivity({ ...track, title: 'A' });

  assert.equal(activity.details?.length, 2);
  assert.ok(activity.details?.startsWith('A'));
});

test('buildActivity truncates text to the 128 characters Discord allows', () => {
  const activity = buildActivity({ ...track, title: 'x'.repeat(300) });

  assert.equal(activity.details?.length, 128);
  assert.ok(activity.details?.endsWith('…'));
});

test('buildActivity picks what Discord shows next to the name from the status text setting', () => {
  assert.equal(buildActivity({ ...track, statusText: 'app' }).statusDisplayType, 0);
  assert.equal(buildActivity({ ...track, statusText: 'artist' }).statusDisplayType, 1);
  assert.equal(buildActivity({ ...track, statusText: 'title' }).statusDisplayType, 2);
});

test('buildActivity omits the progress bar when the track has no timestamps', () => {
  const activity = buildActivity({ ...track, startTimestampMs: null, endTimestampMs: null });

  assert.equal('startTimestamp' in activity, false);
  assert.equal('endTimestamp' in activity, false);
});

test('buildActivity marks a paused track and drops the progress bar, which would keep running', () => {
  const activity = buildActivity({ ...track, paused: true });

  assert.equal(activity.state, 'Paused · TRVNSPORTER, Narvent, SKVLENT');
  assert.equal('startTimestamp' in activity, false);
  assert.equal('endTimestamp' in activity, false);
});

test('buildActivity still links the artist while paused', () => {
  const activity = buildActivity({ ...track, paused: true });

  assert.equal(activity.stateUrl, track.artistUrl);
});

test('buildActivity shows just Paused when a paused track has no artist', () => {
  const activity = buildActivity({ ...track, paused: true, artist: '', artistUrl: null });

  assert.equal(activity.state, 'Paused');
});
