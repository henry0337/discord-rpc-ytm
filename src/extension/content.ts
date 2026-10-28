import { ext } from './api.ts';
import {
  confirmedChannels,
  NATIVE_CHANNELS_KEY,
  parseLearned,
  parseNativeChannels,
  recordChannel,
  type NativeChannels,
} from './nativeChannels.ts';
import { toPlayerState, type PlayerSnapshot } from './playerState.ts';
import {
  AD_ATTRIBUTE,
  DETAILS_ATTRIBUTE,
  LEARNED_ATTRIBUTE,
  NATIVE_ATTRIBUTE,
  POSITION_ATTRIBUTE,
  VIDEO_ID_ATTRIBUTE,
} from './pageAttributes.ts';
import { parsePlaybackPosition } from './playbackPosition.ts';
import { StateReporter, type StateMessage } from './stateReporter.ts';
import { parseDetailsAttribute } from './trackDetails.ts';

const TICK_MS = 1000;

const reporter = new StateReporter({
  stableTicks: 2,
  heartbeatMs: 10_000,
  seekToleranceMs: 2000,
});

function takeSnapshot(): PlayerSnapshot {
  const metadata = navigator.mediaSession.metadata;
  const video = document.querySelector('video');
  const root = document.documentElement;
  return {
    metadata: metadata && {
      title: metadata.title,
      artist: metadata.artist,
      artwork: metadata.artwork.map((image) => ({ src: image.src, sizes: image.sizes ?? '' })),
    },
    // The player API knows the position within the track; the element is only the fallback.
    video: video && {
      ...(parsePlaybackPosition(root.getAttribute(POSITION_ATTRIBUTE), Date.now(), !video.paused) ?? {
        currentTime: video.currentTime,
        duration: video.duration,
      }),
      paused: video.paused,
    },
    videoId: root.getAttribute(VIDEO_ID_ATTRIBUTE),
    details: parseDetailsAttribute(root.getAttribute(DETAILS_ATTRIBUTE)),
    adShowing: root.getAttribute(AD_ATTRIBUTE) === '1',
  };
}

// The artists seen on Japanese titles live in the extension's storage. The page script, which asks
// YouTube Music for names, cannot reach it: it gets the list through an attribute and reports the
// artists it newly saw the same way.
let nativeChannels: NativeChannels = {};
let nativeLoaded = false;

function publishNativeChannels(): void {
  document.documentElement.setAttribute(NATIVE_ATTRIBUTE, JSON.stringify(confirmedChannels(nativeChannels)));
}

void Promise.resolve(ext.storage.local.get(NATIVE_CHANNELS_KEY))
  .then((stored) => {
    nativeChannels = parseNativeChannels(stored[NATIVE_CHANNELS_KEY]);
  })
  .catch(() => {})
  .finally(() => {
    nativeLoaded = true;
    publishNativeChannels();
  });

function rememberLearnedChannels(now: number): void {
  if (!nativeLoaded) return;

  const before = nativeChannels;
  for (const [channelId, videoId] of parseLearned(document.documentElement.getAttribute(LEARNED_ATTRIBUTE))) {
    nativeChannels = recordChannel(nativeChannels, channelId, videoId, now);
  }
  if (nativeChannels === before) return;

  publishNativeChannels();
  void Promise.resolve(ext.storage.local.set({ [NATIVE_CHANNELS_KEY]: nativeChannels })).catch(() => {});
}

function report(message: StateMessage): void {
  try {
    // There is no reply; a rejection only means the background script was not listening yet.
    void Promise.resolve(ext.runtime.sendMessage(message)).catch(() => {});
  } catch {
    // The extension was reloaded or updated: this orphaned script can no longer reach it.
    clearInterval(timer);
  }
}

const timer = setInterval(() => {
  const now = Date.now();
  rememberLearnedChannels(now);
  const message = reporter.observe(toPlayerState(takeSnapshot(), now), now);
  if (message) report(message);
}, TICK_MS);

// Closing the tab or navigating away must not leave a stale presence behind.
addEventListener('pagehide', () => report({ type: 'state', state: null }));
