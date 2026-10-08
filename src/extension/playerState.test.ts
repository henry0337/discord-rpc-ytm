import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPlayerState, type PlayerSnapshot } from './playerState.ts';
import type { TrackDetails } from './trackDetails.ts';

const NOW = 1_700_000_000_000;
const TRVNSPORTER = 'UCvG6SZfCwSCCjifUpGHw1EA';
const ALBUM = 'MPREb_nWA3z8K9P9T';

const details: TrackDetails = {
  videoId: 'dQw4w9WgXcQ',
  title: 'Miss You (Sped Up)',
  artists: [
    { name: 'TRVNSPORTER', channelId: TRVNSPORTER },
    { name: 'Narvent', channelId: null },
    { name: 'SKVLENT', channelId: null },
  ],
  albumId: ALBUM,
  credit: null,
};

function snapshot(overrides: Partial<PlayerSnapshot> = {}): PlayerSnapshot {
  return {
    metadata: {
      title: 'Miss You (Sped Up)',
      artist: 'TRVNSPORTER, Narvent và SKVLENT',
      artwork: [
        { src: 'https://img/60', sizes: '60x60' },
        { src: 'https://img/544', sizes: '544x544' },
        { src: 'https://img/226', sizes: '226x226' },
      ],
    },
    video: { currentTime: 10, duration: 176, paused: false },
    videoId: 'dQw4w9WgXcQ',
    details,
    adShowing: false,
    ...overrides,
  };
}

test('toPlayerState prefers the title of the details, which is what the player bar shows', () => {
  const state = toPlayerState(
    snapshot({
      metadata: { title: 'Hitohira', artist: 'Motohiro Hata', artwork: [] },
      details: { ...details, title: 'ひとひら - Hitohira' },
    }),
    NOW,
  );

  assert.equal(state?.title, 'ひとひら - Hitohira');
});

test('toPlayerState falls back to the media session title when the details have none', () => {
  const state = toPlayerState(snapshot({ details: { ...details, title: null } }), NOW);

  assert.equal(state?.title, 'Miss You (Sped Up)');
});

test('toPlayerState uses the media session title when there is no video ID to look up', () => {
  const state = toPlayerState(
    snapshot({ videoId: null, details: { ...details, title: 'Some other title' } }),
    NOW,
  );

  assert.equal(state?.title, 'Miss You (Sped Up)');
});

test('toPlayerState exposes the title without its credit and the credited names', () => {
  const credited = { ...details, credit: { baseTitle: 'ピュア - Pure', names: ['Eriko Hashimoto'] } };
  const state = toPlayerState(snapshot({ details: credited }), NOW);

  assert.equal(state?.titleWithoutCredit, 'ピュア - Pure');
  assert.deepEqual(state?.credits, ['Eriko Hashimoto']);
});

test('toPlayerState has no credit data when the details carry none', () => {
  const state = toPlayerState(snapshot(), NOW);

  assert.equal(state?.titleWithoutCredit, null);
  assert.deepEqual(state?.credits, []);
});

test('toPlayerState does not repeat a credited name that is already an artist, in any letter case', () => {
  const credited = { ...details, credit: { baseTitle: 'ピュア', names: ['narvent', 'Eriko Hashimoto'] } };
  const state = toPlayerState(snapshot({ details: credited }), NOW);

  assert.deepEqual(state?.credits, ['Eriko Hashimoto']);
  assert.equal(state?.titleWithoutCredit, 'ピュア', 'the credit is still taken out of the title');
});

test('toPlayerState does not repeat a credited name the media session artist already lists', () => {
  const credited = { ...details, artists: [], credit: { baseTitle: 'ピュア', names: ['SKVLENT'] } };

  assert.deepEqual(toPlayerState(snapshot({ details: credited }), NOW)?.credits, []);
});

test('toPlayerState ignores the credit when there is no video ID to tie it to', () => {
  const credited = { ...details, credit: { baseTitle: 'ピュア', names: ['Eriko Hashimoto'] } };
  const state = toPlayerState(snapshot({ videoId: null, details: credited }), NOW);

  assert.equal(state?.titleWithoutCredit, null);
  assert.deepEqual(state?.credits, []);
});

test('toPlayerState derives start and end timestamps from the playback position', () => {
  const state = toPlayerState(snapshot(), NOW);

  assert.equal(state?.startTimestampMs, NOW - 10_000);
  assert.equal(state?.endTimestampMs, NOW - 10_000 + 176_000);
});

test('toPlayerState picks the largest artwork', () => {
  assert.equal(toPlayerState(snapshot(), NOW)?.artworkUrl, 'https://img/544');
});

test('toPlayerState reports playing as the inverse of paused', () => {
  const paused = snapshot({ video: { currentTime: 10, duration: 176, paused: true } });

  assert.equal(toPlayerState(snapshot(), NOW)?.playing, true);
  assert.equal(toPlayerState(paused, NOW)?.playing, false);
});

test('toPlayerState has no artwork when the list is empty', () => {
  const state = toPlayerState(snapshot({ metadata: { title: 'T', artist: 'A', artwork: [] } }), NOW);

  assert.equal(state?.artworkUrl, null);
});

test('toPlayerState carries the video ID through', () => {
  assert.equal(toPlayerState(snapshot(), NOW)?.videoId, 'dQw4w9WgXcQ');
});

test('toPlayerState joins every artist with a comma instead of the localised wording', () => {
  assert.equal(toPlayerState(snapshot(), NOW)?.artist, 'TRVNSPORTER, Narvent, SKVLENT');
});

test('toPlayerState links the first artist only, and only when that artist has a channel', () => {
  assert.equal(toPlayerState(snapshot(), NOW)?.artistChannelId, TRVNSPORTER);

  const unlinkedFirst = {
    ...details,
    artists: [{ name: 'First', channelId: null }, { name: 'Second', channelId: TRVNSPORTER }],
  };
  assert.equal(toPlayerState(snapshot({ details: unlinkedFirst }), NOW)?.artistChannelId, null);
});

test('toPlayerState carries the album ID', () => {
  assert.equal(toPlayerState(snapshot(), NOW)?.albumId, ALBUM);
  assert.equal(toPlayerState(snapshot({ details: { ...details, albumId: null } }), NOW)?.albumId, null);
});

test('toPlayerState falls back to the media session artist when the details list none', () => {
  const state = toPlayerState(snapshot({ details: { ...details, artists: [], albumId: null } }), NOW);

  assert.equal(state?.artist, 'TRVNSPORTER, Narvent và SKVLENT');
  assert.equal(state?.artistChannelId, null);
  assert.equal(state?.albumId, null);
});

test('toPlayerState works without a video ID, using the media session artist and no links', () => {
  const state = toPlayerState(snapshot({ videoId: null, details: null }), NOW);

  assert.equal(state?.artist, 'TRVNSPORTER, Narvent và SKVLENT');
  assert.equal(state?.artistChannelId, null);
  assert.equal(state?.albumId, null);
  assert.equal(state?.videoId, null);
});

test('toPlayerState waits while the details of the current video have not arrived yet', () => {
  assert.equal(toPlayerState(snapshot({ details: null }), NOW), null);
  assert.equal(toPlayerState(snapshot({ details: { ...details, videoId: 'previousVid' } }), NOW), null);
});

test('toPlayerState returns null while an ad is playing', () => {
  assert.equal(toPlayerState(snapshot({ adShowing: true }), NOW), null);
});

test('toPlayerState returns null without media session metadata', () => {
  assert.equal(toPlayerState(snapshot({ metadata: null }), NOW), null);
});

test('toPlayerState returns null while the title is empty', () => {
  const state = toPlayerState(snapshot({ metadata: { title: '', artist: 'A', artwork: [] } }), NOW);

  assert.equal(state, null);
});

test('toPlayerState returns null without a usable duration', () => {
  assert.equal(toPlayerState(snapshot({ video: null }), NOW), null);
  for (const duration of [NaN, 0, Infinity]) {
    const video = { currentTime: 0, duration, paused: false };
    assert.equal(toPlayerState(snapshot({ video }), NOW), null, `duration ${duration}`);
  }
});
