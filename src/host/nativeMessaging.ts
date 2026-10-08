// Native messaging framing: each message is a 4-byte little-endian length followed by UTF-8 JSON.
// Browsers cap incoming (browser -> host) messages at 64 MiB.
const MAX_INCOMING_BYTES = 64 * 1024 * 1024;

export function encodeMessage(message: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  return Buffer.concat([header, json]);
}

export class MessageDecoder {
  private pending: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): unknown[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    const messages: unknown[] = [];

    while (this.pending.length >= 4) {
      const length = this.pending.readUInt32LE(0);
      if (length > MAX_INCOMING_BYTES) {
        throw new Error(`Native message too large: ${length} bytes`);
      }
      if (this.pending.length < 4 + length) break;

      const body = this.pending.subarray(4, 4 + length);
      messages.push(JSON.parse(body.toString('utf8')));
      this.pending = this.pending.subarray(4 + length);
    }

    return messages;
  }
}
