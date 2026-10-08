import { ext } from './api.ts';
import { toPlayerState, type PlayerSnapshot } from './playerState.ts';
import { AD_ATTRIBUTE, DETAILS_ATTRIBUTE, VIDEO_ID_ATTRIBUTE } from './pageAttributes.ts';
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
    video: video && {
      currentTime: video.currentTime,
      duration: video.duration,
      paused: video.paused,
    },
    videoId: root.getAttribute(VIDEO_ID_ATTRIBUTE),
    details: parseDetailsAttribute(root.getAttribute(DETAILS_ATTRIBUTE)),
    adShowing: root.getAttribute(AD_ATTRIBUTE) === '1',
  };
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
  const message = reporter.observe(toPlayerState(takeSnapshot(), now), now);
  if (message) report(message);
}, TICK_MS);

// Closing the tab or navigating away must not leave a stale presence behind.
addEventListener('pagehide', () => report({ type: 'state', state: null }));
