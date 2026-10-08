import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeMessage, MessageDecoder } from './nativeMessaging.ts';

test('encodeMessage prefixes the JSON payload with its byte length (little-endian)', () => {
  const buf = encodeMessage({ type: 'clear' });
  const json = Buffer.from(JSON.stringify({ type: 'clear' }), 'utf8');

  assert.equal(buf.readUInt32LE(0), json.length);
  assert.deepEqual(buf.subarray(4), json);
});

test('encodeMessage counts bytes, not characters, for non-ASCII text', () => {
  const buf = encodeMessage({ title: 'Bài hát' });

  assert.equal(buf.readUInt32LE(0), buf.length - 4);
});

test('MessageDecoder decodes a single complete message', () => {
  const decoder = new MessageDecoder();

  assert.deepEqual(decoder.push(encodeMessage({ a: 1 })), [{ a: 1 }]);
});

test('MessageDecoder decodes several messages arriving in one chunk', () => {
  const decoder = new MessageDecoder();
  const chunk = Buffer.concat([encodeMessage({ n: 1 }), encodeMessage({ n: 2 })]);

  assert.deepEqual(decoder.push(chunk), [{ n: 1 }, { n: 2 }]);
});

test('MessageDecoder buffers a message split across chunks, even inside the length header', () => {
  const decoder = new MessageDecoder();
  const full = encodeMessage({ title: 'Bài hát' });

  assert.deepEqual(decoder.push(full.subarray(0, 2)), []);
  assert.deepEqual(decoder.push(full.subarray(2, 9)), []);
  assert.deepEqual(decoder.push(full.subarray(9)), [{ title: 'Bài hát' }]);
});

test('MessageDecoder rejects a declared length above the browser limit', () => {
  const decoder = new MessageDecoder();
  const header = Buffer.alloc(4);
  header.writeUInt32LE(64 * 1024 * 1024 + 1, 0);

  assert.throws(() => decoder.push(header), /too large/i);
});
