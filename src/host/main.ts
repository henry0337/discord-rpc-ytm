import { appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { HostToExtension } from '../shared/protocol.ts';
import { DiscordConnection } from './discordConnection.ts';
import { parseExtensionMessage } from './messages.ts';
import { encodeMessage, MessageDecoder } from './nativeMessaging.ts';
import { PresenceController, type ActivitySink } from './presenceController.ts';

declare const __VERSION__: string;

const DISCORD_CLIENT_ID = '1556022226644377782';
// Discord rate-limits activity updates; stay comfortably below the limit.
const MIN_UPDATE_INTERVAL_MS = 2000;

const LOG_FILE = path.join(tmpdir(), 'ytm-discord-rpc-host.log');

// stdout carries the native messaging protocol, so logs go to stderr and a file instead.
function log(message: string): void {
  const line = `${new Date().toISOString()} ${message}\n`;
  process.stderr.write(line);
  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    // Logging must never take the host down.
  }
}

function send(message: HostToExtension): void {
  process.stdout.write(encodeMessage(message));
}

/** Runs as the native messaging host: speaks to the browser over stdio and to Discord over IPC. */
export function runHost(): void {
  try {
    writeFileSync(LOG_FILE, '');
  } catch {
    // See log().
  }
  log(`Host ${__VERSION__} started (pid ${process.pid})`);

  let discordConnected = false;
  const connection = new DiscordConnection({
    clientId: DISCORD_CLIENT_ID,
    log,
    onConnectionChange: (connected) => {
      controller.setConnected(connected);
      if (connected === discordConnected) return;
      discordConnected = connected;
      send({ type: 'discord', connected });
    },
  });
  const loggedConnection: ActivitySink = {
    async set(activity) {
      log(`Setting activity: ${String(activity.details)} — ${String(activity.state)}`);
      await connection.set(activity);
    },
    async clear() {
      log('Clearing activity');
      await connection.clear();
    },
  };
  const controller = new PresenceController(loggedConnection, {
    minIntervalMs: MIN_UPDATE_INTERVAL_MS,
    log,
  });

  const decoder = new MessageDecoder();
  process.stdin.on('data', (chunk: Buffer) => {
    let messages: unknown[];
    try {
      messages = decoder.push(chunk);
    } catch (error) {
      log(`Bad native message stream: ${String(error)}`);
      shutdown();
      return;
    }
    for (const raw of messages) {
      const message = parseExtensionMessage(raw);
      if (!message) {
        log(`Ignoring unrecognised message: ${JSON.stringify(raw)}`);
      } else if (message.type === 'setTrack') {
        controller.setTrack(message.track);
      } else {
        controller.setTrack(null);
      }
    }
  });

  // The browser closes stdin when the extension disconnects or the browser quits.
  process.stdin.on('end', shutdown);
  process.stdout.on('error', shutdown);
  process.on('unhandledRejection', (reason) => log(`Unhandled rejection: ${String(reason)}`));

  function shutdown(): void {
    log('Shutting down');
    void connection.stop().finally(() => process.exit(0));
  }

  send({ type: 'hello', version: __VERSION__ });
  connection.start();
}
