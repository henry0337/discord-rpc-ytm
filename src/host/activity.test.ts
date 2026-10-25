import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playbackIconUrl } from '../shared/display.ts';
import { buildActivity } from './activity.ts';
import type { Track } from '../shared/protocol.ts';

const track: Track = {
  title: 'Miss You (Sped Up)',
  artist: 'TRVNSPORTER, Narvent, SKVLENT',
  artistUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
  imageUrl: 'https://music.youtube.com/browse/MPREb_nWA3z8K9P9T',
  artworkUrl: 'https://yt3.googleusercontent.com/abc=w544-h544-l90-rj',
  imageText: null,
  playbackText: null,
  button: { label: 'Phát trên YouTube Music (Web)', url: 'https://music.youtube.com/watch?v=abc' },
  startTimestampMs: 1_000_000,
  endTimestampMs: 1_176_000,
  paused: false,
};

test('buildActivity shows a Listening activity with clickable artist and artwork, progress bar and button', () => {
  assert.deepEqual(buildActivity(track), {
    type: 2,
    details: 'Miss You (Sped Up)',
    state: 'TRVNSPORTER, Narvent, SKVLENT',
    stateUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
    largeImageKey: 'https://yt3.googleusercontent.com/abc=w544-h544-l90-rj',
    largeImageUrl: 'https://music.youtube.com/browse/MPREb_nWA3z8K9P9T',
    smallImageKey: playbackIconUrl(false),
    startTimestamp: 1_000_000,
    endTimestamp: 1_176_000,
    statusDisplayType: 1,
    buttons: [
      { label: 'Phát trên YouTube Music (Web)', url: 'https://music.youtube.com/watch?v=abc' },
    ],
  });
});

test('buildActivity puts the play or pause icon at the corner of the artwork', () => {
  assert.equal(buildActivity(track).smallImageKey, playbackIconUrl(false));
  assert.equal(buildActivity({ ...track, paused: true }).smallImageKey, playbackIconUrl(true));
});

test('buildActivity words the hover text of the icon from the playback text, when there is one', () => {
  assert.equal('smallImageText' in buildActivity(track), false);
  assert.equal(buildActivity({ ...track, playbackText: 'Đang phát' }).smallImageText, 'Đang phát');
});

test('buildActivity has no icon when there is no artwork to put it on', () => {
  const activity = buildActivity({ ...track, artworkUrl: null, playbackText: 'Playing' });

  assert.equal('smallImageKey' in activity, false);
  assert.equal('smallImageText' in activity, false);
});

test('buildActivity sets the hover text of the artwork from the image text', () => {
  assert.equal(buildActivity({ ...track, imageText: 'Miss You' }).largeImageText, 'Miss You');
});

test('buildActivity leaves the hover text out when the track has none, or has no artwork to hover', () => {
  assert.equal('largeImageText' in buildActivity(track), false);
  assert.equal('largeImageText' in buildActivity({ ...track, imageText: 'Miss You', artworkUrl: null }), false);
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
  const activity = buildActivity({ ...track, imageUrl: null });

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

test('buildActivity shows the artists next to the name', () => {
  assert.equal(buildActivity(track).statusDisplayType, 1);
});

test('buildActivity omits the progress bar when the track has no timestamps', () => {
  const activity = buildActivity({ ...track, startTimestampMs: null, endTimestampMs: null });

  assert.equal('startTimestamp' in activity, false);
  assert.equal('endTimestamp' in activity, false);
});

test('buildActivity drops the progress bar of a paused track, which would keep running', () => {
  const activity = buildActivity({ ...track, paused: true });

  assert.equal(activity.state, 'TRVNSPORTER, Narvent, SKVLENT');
  assert.equal('startTimestamp' in activity, false);
  assert.equal('endTimestamp' in activity, false);
});

test('buildActivity still links the artist while paused', () => {
  const activity = buildActivity({ ...track, paused: true });

  assert.equal(activity.stateUrl, track.artistUrl);
});

test('buildActivity has no state line when a paused track has no artist', () => {
  const activity = buildActivity({ ...track, paused: true, artist: '', artistUrl: null });

  assert.equal('state' in activity, false);
});
