import { HOST_NAME } from '../shared/protocol.ts';

export type BrowserFamily = 'chromium' | 'firefox';

export interface RegistryKey {
  browser: string;
  family: BrowserFamily;
  key: string;
}

const DESCRIPTION = 'Discord RPC for YouTube Music native host';

/** The JSON file a browser reads to learn how to launch the host and who may talk to it. */
export function nativeManifest(family: BrowserFamily, hostPath: string, extensionIds: string[]) {
  const base = { name: HOST_NAME, description: DESCRIPTION, path: hostPath, type: 'stdio' };
  if (family === 'firefox') return { ...base, allowed_extensions: extensionIds };
  return { ...base, allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`) };
}

/** Per-user (HKCU) registry keys whose default value must point at the native manifest. */
export function registryKeys(): RegistryKey[] {
  const entry = (browser: string, family: BrowserFamily, vendorPath: string): RegistryKey => ({
    browser,
    family,
    key: `HKCU\\Software\\${vendorPath}\\NativeMessagingHosts\\${HOST_NAME}`,
  });
  return [
    entry('Chrome', 'chromium', 'Google\\Chrome'),
    entry('Edge', 'chromium', 'Microsoft\\Edge'),
    entry('Chromium', 'chromium', 'Chromium'),
    entry('Brave', 'chromium', 'BraveSoftware\\Brave-Browser'),
    entry('Firefox', 'firefox', 'Mozilla'),
  ];
}

/** Browsers start the host from a path, so a tiny .bat pins the node binary and script. */
export function launcherScript(nodePath: string, scriptPath: string): string {
  return `@echo off\r\n"${nodePath}" "${scriptPath}" %*\r\n`;
}
