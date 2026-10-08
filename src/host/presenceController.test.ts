import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PresenceController, type ActivitySink } from './presenceController.ts';
import type { Track } from '../shared/protocol.ts';

const MIN_INTERVAL_MS = 2000;

function track(overrides: Partial<Track> = {}): Track {
  return {
    title: 'Song',
    artist: 'Artist',
    artistUrl: null,
    albumUrl: null,
    artworkUrl: null,
    button: null,
    startTimestampMs: 1_000_000,
    endTimestampMs: 1_200_000,
    paused: false,
    statusText: 'app',
    ...overrides,
  };
}

function setup() {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const calls: string[] = [];
  const titles: string[] = [];
  const sink: ActivitySink = {
    async set(activity) {
      calls.push('set');
      titles.push(String(activity.details));
    },
    async clear() {
      calls.push('clear');
    },
  };
  const controller = new PresenceController(sink, {
    minIntervalMs: MIN_INTERVAL_MS,
    log: () => {},
  });
  return { calls, titles, controller };
}

afterEach(() => mock.timers.reset());

test('applies a track immediately when Discord is connected', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);

  controller.setTrack(track());
  await Promise.resolve();

  assert.deepEqual(calls, ['set']);
});

test('holds a track while Discord is disconnected and applies it once connected', async () => {
  const { calls, controller } = setup();

  controller.setTrack(track());
  await Promise.resolve();
  assert.deepEqual(calls, []);

  controller.setConnected(true);
  await Promise.resolve();
  assert.deepEqual(calls, ['set']);
});

test('clears the activity when the track goes away', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track());
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);

  controller.setTrack(null);
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'clear']);
});

test('does not send a clear when nothing is being displayed', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);

  controller.setTrack(null);
  await Promise.resolve();

  assert.deepEqual(calls, []);
});

test('skips a heartbeat that only drifts the timestamps slightly', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track());
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);

  controller.setTrack(track({ startTimestampMs: 1_000_500, endTimestampMs: 1_200_500 }));
  await Promise.resolve();

  assert.deepEqual(calls, ['set']);
});

test('applies an update whose timestamps jumped, such as after a seek', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track());
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);

  controller.setTrack(track({ startTimestampMs: 990_000, endTimestampMs: 1_190_000 }));
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set']);
});

test('applies an update when only the button changes, such as a language switch', async () => {
  const { calls, controller } = setup();
  const button = (label: string) => ({ label, url: 'https://music.youtube.com/watch?v=abc' });
  controller.setConnected(true);
  controller.setTrack(track({ button: button('Play on YouTube Music (Web)') }));
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);

  controller.setTrack(track({ button: button('Phát trên YouTube Music (Web)') }));
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set']);
});

test('applies an update when the artist or album link appears after the track was first shown', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track());
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);

  controller.setTrack(track({ artistUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA' }));
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);
  controller.setTrack(
    track({
      artistUrl: 'https://music.youtube.com/channel/UCvG6SZfCwSCCjifUpGHw1EA',
      albumUrl: 'https://music.youtube.com/browse/MPREb_nWA3z8K9P9T',
    }),
  );
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set', 'set']);
});

test('applies an update when the button link appears after the track was first shown', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track({ button: null }));
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);

  const button = { label: 'Play', url: 'https://music.youtube.com/watch?v=abc' };
  controller.setTrack(track({ button }));
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set']);
});

test('applies an update when pausing, resuming or changing the status text', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track());
  await Promise.resolve();

  for (const change of [{ paused: true }, { statusText: 'title' as const }]) {
    mock.timers.tick(MIN_INTERVAL_MS);
    controller.setTrack(track(change));
    await Promise.resolve();
  }

  assert.deepEqual(calls, ['set', 'set', 'set']);
});

test('applies an update when the progress bar is switched off and on', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track());
  await Promise.resolve();

  mock.timers.tick(MIN_INTERVAL_MS);
  controller.setTrack(track({ startTimestampMs: null, endTimestampMs: null }));
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);
  controller.setTrack(track());
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set', 'set']);
});

test('skips a heartbeat of a track that has no timestamps', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  const noBar = { startTimestampMs: null, endTimestampMs: null };
  controller.setTrack(track(noBar));
  await Promise.resolve();
  mock.timers.tick(MIN_INTERVAL_MS);

  controller.setTrack(track(noBar));
  await Promise.resolve();

  assert.deepEqual(calls, ['set']);
});

test('throttles rapid updates and sends only the latest one afterwards', async () => {
  const { calls, titles, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track({ title: 'First' }));
  await Promise.resolve();

  controller.setTrack(track({ title: 'Second' }));
  controller.setTrack(track({ title: 'Third' }));
  await Promise.resolve();
  assert.deepEqual(calls, ['set'], 'updates inside the interval are deferred');

  mock.timers.tick(MIN_INTERVAL_MS);
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set']);
  assert.deepEqual(titles, ['First', 'Third']);
});

test('re-applies the current track after Discord reconnects', async () => {
  const { calls, controller } = setup();
  controller.setConnected(true);
  controller.setTrack(track());
  await Promise.resolve();

  controller.setConnected(false);
  mock.timers.tick(MIN_INTERVAL_MS);
  controller.setConnected(true);
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set']);
});

test('keeps working after the sink throws, retrying on the next update', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let shouldFail = true;
  const calls: string[] = [];
  const logged: string[] = [];
  const controller = new PresenceController(
    {
      async set() {
        calls.push('set');
        if (shouldFail) throw new Error('pipe closed');
      },
      async clear() {},
    },
    { minIntervalMs: MIN_INTERVAL_MS, log: (m) => logged.push(m) },
  );
  controller.setConnected(true);
  controller.setTrack(track());
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(logged.length, 1);

  shouldFail = false;
  mock.timers.tick(MIN_INTERVAL_MS);
  controller.setTrack(track());
  await Promise.resolve();

  assert.deepEqual(calls, ['set', 'set']);
});
