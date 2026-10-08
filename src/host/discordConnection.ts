import { Client, type SetActivity } from '@xhayper/discord-rpc';
import type { ActivitySink } from './presenceController.ts';

const RECONNECT_DELAY_MS = 5000;

export interface DiscordConnectionOptions {
  clientId: string;
  onConnectionChange: (connected: boolean) => void;
  log: (message: string) => void;
}

/**
 * Talks to the local Discord client over IPC. Discord may be started after the browser, or
 * restarted at any time, so a failed or lost connection is retried forever.
 */
export class DiscordConnection implements ActivitySink {
  private readonly options: DiscordConnectionOptions;
  private client: Client | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;

  constructor(options: DiscordConnectionOptions) {
    this.options = options;
  }

  start(): void {
    void this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.retryTimer !== undefined) clearTimeout(this.retryTimer);
    const client = this.client;
    this.client = undefined;
    await client?.destroy().catch(() => {});
  }

  async set(activity: SetActivity): Promise<void> {
    const user = this.client?.user;
    if (!user) throw new Error('Discord is not connected');
    await user.setActivity(activity);
  }

  async clear(): Promise<void> {
    await this.client?.user?.clearActivity();
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;

    const client = new Client({ clientId: this.options.clientId });
    this.client = client;
    client.on('ready', () => {
      if (this.client !== client) return;
      this.options.log('Connected to Discord');
      this.options.onConnectionChange(true);
    });
    client.on('disconnected', () => this.handleLost(client, 'Disconnected from Discord'));

    try {
      await client.login();
    } catch (error) {
      this.handleLost(client, `Could not reach Discord (${String(error)}); will retry`);
    }
  }

  private handleLost(client: Client, reason: string): void {
    if (this.client !== client) return; // already handled
    this.client = undefined;
    this.options.log(reason);
    this.options.onConnectionChange(false);
    void client.destroy().catch(() => {});

    if (this.stopped) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.connect();
    }, RECONNECT_DELAY_MS);
  }
}
