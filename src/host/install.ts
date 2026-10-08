import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CHROMIUM_EXTENSION_ID, GECKO_EXTENSION_ID } from '../shared/protocol.ts';
import { launcherScript, nativeManifest, registryKeys, type BrowserFamily } from './installPlan.ts';

function requireWindows(): void {
  if (process.platform !== 'win32') {
    throw new Error('Installing the native host is only implemented for Windows so far.');
  }
}

function hostDirectory(): string {
  return path.dirname(path.resolve(process.argv[1] ?? ''));
}

function manifestPath(dir: string, family: BrowserFamily): string {
  return path.join(dir, `native-manifest.${family}.json`);
}

/** Registers the host with every supported browser for the current user. */
export function install(extraChromiumIds: string[]): void {
  requireWindows();
  const dir = hostDirectory();
  mkdirSync(dir, { recursive: true });

  const launcher = path.join(dir, 'host.bat');
  writeFileSync(launcher, launcherScript(process.execPath, path.resolve(process.argv[1] ?? '')));

  const ids: Record<BrowserFamily, string[]> = {
    chromium: [CHROMIUM_EXTENSION_ID, ...extraChromiumIds],
    firefox: [GECKO_EXTENSION_ID],
  };
  for (const family of ['chromium', 'firefox'] as const) {
    const manifest = nativeManifest(family, launcher, ids[family]);
    writeFileSync(manifestPath(dir, family), JSON.stringify(manifest, null, 2) + '\n');
  }

  for (const { browser, family, key } of registryKeys()) {
    execFileSync('reg', ['add', key, '/ve', '/t', 'REG_SZ', '/d', manifestPath(dir, family), '/f'], {
      stdio: 'ignore',
    });
    console.log(`Registered with ${browser}`);
  }
  console.log(`Launcher: ${launcher}`);
}

export function uninstall(): void {
  requireWindows();
  const dir = hostDirectory();

  for (const { browser, key } of registryKeys()) {
    try {
      execFileSync('reg', ['delete', key, '/f'], { stdio: 'ignore' });
      console.log(`Unregistered from ${browser}`);
    } catch {
      // The key was not there.
    }
  }
  for (const file of ['host.bat', 'native-manifest.chromium.json', 'native-manifest.firefox.json']) {
    rmSync(path.join(dir, file), { force: true });
  }
}
