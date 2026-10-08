import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromiumExtensionId } from './extensionId.ts';
import { CHROMIUM_EXTENSION_ID } from './protocol.ts';

test('chromiumExtensionId yields 32 characters in the range a-p', () => {
  const id = chromiumExtensionId(Buffer.from('any public key bytes').toString('base64'));

  assert.match(id, /^[a-p]{32}$/);
});

test('chromiumExtensionId maps the first 128 bits of the key SHA-256 onto a-p', () => {
  // sha256("abc") = ba7816bf8f01cfea414140de5dae2223 b00361a3...; hex digit n becomes 'a' + n.
  const id = chromiumExtensionId(Buffer.from('abc').toString('base64'));

  assert.equal(id, 'lkhibglpipabmpokebebeanofnkocccd');
});

test('the extension ID baked into the host matches the key in the extension manifest', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../extension/manifest.base.json', import.meta.url), 'utf8'),
  );

  assert.equal(chromiumExtensionId(manifest.key), CHROMIUM_EXTENSION_ID);
});
