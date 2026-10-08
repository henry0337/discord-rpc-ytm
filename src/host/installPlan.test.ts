import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nativeManifest, registryKeys, launcherScript } from './installPlan.ts';
import { HOST_NAME } from '../shared/protocol.ts';

test('nativeManifest for Chromium allows only the given extension origins', () => {
  const manifest = nativeManifest('chromium', 'C:\\host\\host.bat', ['abc', 'def']);

  assert.deepEqual(manifest, {
    name: HOST_NAME,
    description: 'Discord RPC for YouTube Music native host',
    path: 'C:\\host\\host.bat',
    type: 'stdio',
    allowed_origins: ['chrome-extension://abc/', 'chrome-extension://def/'],
  });
});

test('nativeManifest for Firefox allows only the given extension IDs', () => {
  const manifest = nativeManifest('firefox', 'C:\\host\\host.bat', ['me@extension']);

  assert.deepEqual(manifest, {
    name: HOST_NAME,
    description: 'Discord RPC for YouTube Music native host',
    path: 'C:\\host\\host.bat',
    type: 'stdio',
    allowed_extensions: ['me@extension'],
  });
});

test('registryKeys registers the host under every supported browser, per user', () => {
  const keys = registryKeys();

  assert.deepEqual(
    keys.map((k) => [k.browser, k.family]),
    [
      ['Chrome', 'chromium'],
      ['Edge', 'chromium'],
      ['Chromium', 'chromium'],
      ['Brave', 'chromium'],
      ['Firefox', 'firefox'],
    ],
  );
  for (const key of keys) {
    assert.ok(key.key.startsWith('HKCU\\Software\\'), key.key);
    assert.ok(key.key.endsWith(`\\NativeMessagingHosts\\${HOST_NAME}`), key.key);
  }
});

test('launcherScript runs the host script with the given node binary and forwards arguments', () => {
  const script = launcherScript('C:\\Program Files\\nodejs\\node.exe', 'D:\\x y\\host.cjs');

  assert.equal(
    script,
    '@echo off\r\n"C:\\Program Files\\nodejs\\node.exe" "D:\\x y\\host.cjs" %*\r\n',
  );
});
