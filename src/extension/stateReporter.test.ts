import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StateReporter } from './stateReporter.ts';
import type { PlayerState } from './playerState.ts';

const T0 = 1_700_000_000_000;

function playing(overrides: Partial<PlayerState> = {}, now = T0, position = 10): PlayerState {
  return {
    title: 'Song',
    artist: 'Artist',
    artistChannelId: null,
    albumId: null,
    titleWithoutCredit: null,
    credits: [],
    artworkUrl: null,
    videoId: null,
    startTimestampMs: now - position * 1000,
    endTimestampMs: now - position * 1000 + 200_000,
    playing: true,
    ...overrides,
  };
}

function newReporter() {
  return new StateReporter({ stableTicks: 2, heartbeatMs: 10_000, seekToleranceMs: 2000 });
}

test('waits for the same state on two consecutive ticks before reporting it', () => {
  const reporter = newReporter();

  assert.equal(reporter.observe(playing(), T0), undefined);
  assert.deepEqual(reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000), {
    type: 'state',
    state: playing({}, T0 + 1000, 11),
  });
});

test('does not re-report an unchanged state before the heartbeat is due', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  for (let s = 2; s < 10; s++) {
    const now = T0 + s * 1000;
    assert.equal(reporter.observe(playing({}, now, 10 + s), now), undefined, `tick ${s}`);
  }
});

test('re-reports an unchanged playing state once the heartbeat is due', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  const now = T0 + 1000 + 10_000;
  assert.equal(reporter.observe(playing({}, now, 21), now)?.type, 'state');
});

test('reports a seek immediately, without waiting for stability', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  // One second later the playhead jumped from ~12s to 60s.
  const now = T0 + 2000;
  const message = reporter.observe(playing({}, now, 60), now);

  assert.equal(message?.type, 'state');
});

test('waits for stability when the track changes', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  const next = (now: number) => playing({ title: 'Next song' }, now, 0);
  assert.equal(reporter.observe(next(T0 + 2000), T0 + 2000), undefined);
  const message = reporter.observe(next(T0 + 3000), T0 + 3000);

  assert.equal(message?.type === 'state' && message.state?.title, 'Next song');
});

test('reports the video ID once it shows up for a track that was already reported', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  const withId = (now: number) => playing({ videoId: 'dQw4w9WgXcQ' }, now, 12);
  assert.equal(reporter.observe(withId(T0 + 2000), T0 + 2000), undefined);
  const message = reporter.observe(withId(T0 + 3000), T0 + 3000);

  assert.equal(message?.type === 'state' && message.state?.videoId, 'dQw4w9WgXcQ');
});

test('reports an artist channel or album that shows up for a track that was already reported', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  const linked = (now: number) =>
    playing({ artistChannelId: 'UCvG6SZfCwSCCjifUpGHw1EA', albumId: 'MPREb_nWA3z8K9P9T' }, now, 12);
  assert.equal(reporter.observe(linked(T0 + 2000), T0 + 2000), undefined);
  const message = reporter.observe(linked(T0 + 3000), T0 + 3000);

  assert.equal(message?.type === 'state' && message.state?.albumId, 'MPREb_nWA3z8K9P9T');
});

test('reports credited names that show up for a track that was already reported', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  const credited = (now: number) =>
    playing({ titleWithoutCredit: 'ピュア - Pure', credits: ['Eriko Hashimoto'] }, now, 12);
  assert.equal(reporter.observe(credited(T0 + 2000), T0 + 2000), undefined);
  const message = reporter.observe(credited(T0 + 3000), T0 + 3000);

  assert.deepEqual(message?.type === 'state' && message.state?.credits, ['Eriko Hashimoto']);
});

test('reports pausing after it is stable', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  const paused = (now: number) => playing({ playing: false }, now, 12);
  assert.equal(reporter.observe(paused(T0 + 2000), T0 + 2000), undefined);
  const message = reporter.observe(paused(T0 + 3000), T0 + 3000);

  assert.equal(message?.type === 'state' && message.state?.playing, false);
});

test('does not send heartbeats while paused', () => {
  const reporter = newReporter();
  const paused = (now: number) => playing({ playing: false }, now, 12);
  reporter.observe(paused(T0), T0);
  reporter.observe(paused(T0 + 1000), T0 + 1000);

  assert.equal(reporter.observe(paused(T0 + 30_000), T0 + 30_000), undefined);
});

test('reports that the state is gone once it stays null', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  assert.equal(reporter.observe(null, T0 + 2000), undefined);
  assert.deepEqual(reporter.observe(null, T0 + 3000), { type: 'state', state: null });
});

test('never reports anything while the state has always been null', () => {
  const reporter = newReporter();

  for (let s = 0; s < 5; s++) {
    assert.equal(reporter.observe(null, T0 + s * 1000), undefined);
  }
});

test('ignores a one-tick blip to null during a track change', () => {
  const reporter = newReporter();
  reporter.observe(playing(), T0);
  reporter.observe(playing({}, T0 + 1000, 11), T0 + 1000);

  assert.equal(reporter.observe(null, T0 + 2000), undefined);
  assert.equal(reporter.observe(playing({}, T0 + 3000, 13), T0 + 3000), undefined);
});
