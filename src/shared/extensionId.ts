import { createHash } from 'node:crypto';

/**
 * Chromium derives an extension's ID from its public key: the first 128 bits of the SHA-256 of the
 * DER-encoded key, written as hex with the digits 0-f replaced by a-p.
 * `publicKeyBase64` is the `key` field of manifest.json.
 */
export function chromiumExtensionId(publicKeyBase64: string): string {
  const digest = createHash('sha256').update(Buffer.from(publicKeyBase64, 'base64')).digest('hex');
  return digest
    .slice(0, 32)
    .replace(/./g, (hexDigit) => String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(hexDigit, 16)));
}
