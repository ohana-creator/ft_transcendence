import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { UsersService } from '../users/users.service.js';

type EventHandler = (payload: any) => Promise<void>;

interface StreamSubscription {
    stream: string;
    handlers: Map<string, EventHandler>;
}

@Injectable()
export class EventConsumerService implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(EventConsumerService.name);
    private readonly GROUP = 'user-service';
    private readonly CONSUMER = `user-${process.pid}`;
    private readonly subscriptions: StreamSubscription[] = [];
    private running = false;

    constructor(
        private readonly redis: RedisService,
        private readonly usersService: UsersService,
    ) {}

    async onModuleInit()
    {
        this.registerHandlers();
        await this.setupConsumerGroups();
        this.startPolling();
    }

    async onModuleDestroy()
    {
        this.running = false;
    }

    // ── Handler Registration ──────────────────────────────────

    private registerHandlers()
    {
        // Auth Service events
        this.on('auth-events', 'user.created', async (payload) => {
            await this.usersService.createFromEvent(payload);
            this.logger.debug("user profile created from auth event");
        });
    }

    private on(stream: string, event: string, handler: EventHandler)
    {
        let sub = this.subscriptions.find(s => s.stream === stream);
        if (!sub)
        {
            sub = { stream, handlers: new Map() };
            this.subscriptions.push(sub);
        }
        sub.handlers.set(event, handler);
    }

    // ── Consumer Group Setup ──────────────────────────────────

    private async setupConsumerGroups()
    {
        for (const sub of this.subscriptions)
        {
            await this.redis.ensureConsumerGroup(sub.stream, this.GROUP);
        }
    }

    // ── Polling Loop ──────────────────────────────────────────

    private startPolling()
    {
        this.running = true;
        for (const sub of this.subscriptions)
        {
            this.pollStream(sub);
        }
    }

    private async pollStream(sub: StreamSubscription)
    {
        while (this.running)
        {
            try
            {
                const results = await this.redis.consumeGroup(
                    sub.stream, this.GROUP, this.CONSUMER,
                );
                if (!results) continue;

                for (const [, messages] of results as Array<[string, [string, string[]][]]>)
                {
                    for (const [id, fields] of messages as [string, string[]][])
                    {
                        await this.processMessage(sub, id, fields);
                    }
                }
            }
            catch (err)
            {
                this.logger.error(`Error polling ${sub.stream}`, err);
                await this.sleep(5000);
            }
        }
    }

    // ── Message Processing ────────────────────────────────────

    private async processMessage(sub: StreamSubscription, id: string, fields: string[])
    {
        let data: Record<string, string>;
        try {
            data = this.parseFields(fields);
        } catch (err) {
            this.logger.error(`Failed to parse fields for message ${id}`, err);
            await this.redis.ack(sub.stream, this.GROUP, id);
            return;
        }

        const event = data['event'];
        let payload: any;
        try {
            payload = data['payload'] ? JSON.parse(data['payload']) : {};
        } catch (err) {
            this.logger.error(`Malformed JSON in message ${id} (event: ${event})`, err);
            await this.redis.ack(sub.stream, this.GROUP, id);
            return;
        }

        const handler = sub.handlers.get(event);
        if (handler)
        {
            try
            {
                await handler(payload);
                this.logger.log(`Handled ${event} (id: ${id})`);
                await this.redis.ack(sub.stream, this.GROUP, id);
            }
            catch (err)
            {
                this.logger.error(`Failed to handle ${event} (id: ${id}) — will retry`, err);
            }
        }
        else
        {
            this.logger.warn(`No handler for event "${event}" on stream ${sub.stream}`);
            await this.redis.ack(sub.stream, this.GROUP, id);
        }
    }

    private parseFields(fields: string[]): Record<string, string>
    {
        const result: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2)
        {
            result[fields[i]] = fields[i + 1];
        }
        return result;
    }

    private sleep(ms: number): Promise<void>
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
