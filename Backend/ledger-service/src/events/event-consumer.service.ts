import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { RedisService } from "../redis/redis.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

type EventHandler = (payload: any) => Promise<void>;

interface StreamSubscription {
  stream: string;
  handlers: Map<string, EventHandler>;
}

@Injectable()
export class EventConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger   = new Logger(EventConsumerService.name);
  private readonly GROUP    = "ledger-service";
  private readonly CONSUMER = "ledger-" + process.pid;
  private readonly subscriptions: StreamSubscription[] = [];
  private running = false;

  constructor(
    private readonly redis:  RedisService,
    private readonly ledger: LedgerService,
  ) {}

  async onModuleInit() {
    this.registerHandlers();
    await this.setupConsumerGroups();
    this.startPolling();
  }

  async onModuleDestroy() { this.running = false; }

  private registerHandlers() {
    this.on("wallet-events", "wallet.deposit", async (payload) => {
      await this.ledger.handleWalletDeposit(payload);
    });
  }

  private on(stream: string, event: string, handler: EventHandler) {
    let sub = this.subscriptions.find(s => s.stream === stream);
    if (!sub) { sub = { stream, handlers: new Map() }; this.subscriptions.push(sub); }
    sub.handlers.set(event, handler);
  }

  private async setupConsumerGroups() {
    for (const sub of this.subscriptions)
      await this.redis.ensureConsumerGroup(sub.stream, this.GROUP);
  }

  private startPolling() {
    this.running = true;
    for (const sub of this.subscriptions) this.pollStream(sub);
  }

  private async pollStream(sub: StreamSubscription) {
    while (this.running) {
      try {
        const results = await this.redis.consumeGroup(sub.stream, this.GROUP, this.CONSUMER);
        if (!results) continue;
        for (const entry of results as any[]) {
          for (const msg of entry.messages) {
            await this.processMessage(sub, msg.id, msg.message);
          }
        }
      } catch (err) {
        this.logger.error("Error polling " + sub.stream, err);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  private async processMessage(sub: StreamSubscription, id: string, message: Record<string, string>) {
    const event   = message["event"];
    const payload = message["payload"] ? JSON.parse(message["payload"]) : {};
    const handler = sub.handlers.get(event);

    if (handler) {
      try { await handler(payload); this.logger.log("Handled " + event + " (id: " + id + ")"); }
      catch (err) { this.logger.error("Failed to handle " + event, err); }
    }

    await this.redis.ack(sub.stream, this.GROUP, id);
  }
}
