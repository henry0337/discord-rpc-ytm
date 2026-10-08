import type { Status } from './status.ts';

export interface DiagnosticsEnvironment {
  userAgent: string;
  browserLanguage: string;
}

const yesNo = (value: boolean): string => (value ? 'yes' : 'no');

/**
 * A plain-text snapshot a user can paste into a bug report. It says which links exist but does not
 * include the links, so it is safe to share.
 */
export function formatDiagnostics(status: Status, env: DiagnosticsEnvironment): string {
  const lines = [
    `Version: ${status.version}`,
    `Browser: ${env.userAgent}`,
    `Browser language: ${env.browserLanguage}`,
    `Native host: ${status.host}${status.hostError ? ` (${status.hostError})` : ''}`,
    `Discord: ${status.discordConnected ? 'connected' : 'not connected'}`,
    `YouTube Music tabs: ${status.tabs}`,
    '',
    'Settings:',
    ...Object.entries(status.settings).map(([key, value]) => `  ${key}: ${String(value)}`),
    `Button language in use: ${status.buttonLanguage}`,
    '',
  ];

  const now = status.now;
  if (now) {
    lines.push(`Now playing: ${now.title} — ${now.artist} (${now.paused ? 'paused' : 'playing'})`);
  } else {
    lines.push('Now playing: nothing');
  }
  lines.push(`Shown on Discord: ${yesNo(status.shown)}`);
  if (now) {
    lines.push(
      `Artist link: ${yesNo(now.artistUrl !== null)}`,
      `Album link: ${yesNo(now.albumUrl !== null)}`,
      `Play button: ${yesNo(now.button !== null)}`,
    );
  }
  return lines.join('\n');
}
