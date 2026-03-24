import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

type EventHandler = (payload: any) => Promise<void>;

interface StreamSubscription {
    stream: string;
    handlers: Map<string, EventHandler>;
}

@Injectable()
export class EventConsumerService implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(EventConsumerService.name);
    private readonly GROUP = 'notification-service';
    private readonly CONSUMER = `notification-${process.pid}`;
    private readonly subscriptions: StreamSubscription[] = [];
    private running = false;

    constructor(
        private readonly redis: RedisService,
        private readonly notificationsService: NotificationsService,
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
        // Campaign events
        this.on('campaign-events', 'campaign.created', async (payload) => {
            await this.notificationsService.create({
                userId: payload.ownerId,
                type: 'CAMPAIGN_CONTRIBUTION',
                title: 'Campaign Created',
                message: `Your campaign "${payload.title}" has been created successfully.`,
                metadata: { campaignId: payload.id },
            });
            this.logger.debug('Notification created for campaign.created');
        });

        this.on('campaign-events', 'campaign.closed', async (payload) => {
            await this.notificationsService.create({
                userId: payload.ownerId,
                type: 'CAMPAIGN_CLOSED',
                title: 'Campaign Closed',
                message: `Campaign "${payload.title}" has been closed.`,
                metadata: { campaignId: payload.id },
            });
            this.logger.debug('Notification created for campaign.closed');
        });

        this.on('campaign-events', 'campaign.goal_reached', async (payload) => {
            await this.notificationsService.create({
                userId: payload.ownerId,
                type: 'CAMPAIGN_GOAL_REACHED',
                title: 'Goal Reached!',
                message: `Campaign "${payload.title}" has reached its funding goal!`,
                metadata: { campaignId: payload.id },
            });
            this.logger.debug('Notification created for campaign.goal_reached');
        });

        this.on('campaign-events', 'member.promoted', async (payload) => {
            await this.notificationsService.create({
                userId: payload.userId,
                type: 'MEMBER_PROMOTED',
                title: 'You have been promoted',
                message: `You have been promoted to SUDO in campaign "${payload.campaignTitle}".`,
                metadata: { campaignId: payload.campaignId },
            });
            this.logger.debug('Notification created for member.promoted');
        });

        this.on('campaign-events', 'campaign.invited', async (payload) => {
            await this.notificationsService.create({
                userId: payload.invitedUserId,
                type: 'CAMPAIGN_INVITE',
                title: 'Campaign Invitation',
                message: `${payload.inviterName} invited you to join campaign "${payload.campaignTitle}".`,
                metadata: { campaignId: payload.campaignId, invitationId: payload.invitationId },
            });
            this.logger.debug('Notification created for campaign.invited');
        });

        // Wallet events — contribution confirmation
        this.on('wallet-events', 'contribution.completed', async (payload) => {
            await this.notificationsService.create({
                userId: payload.userId,
                type: 'CAMPAIGN_CONTRIBUTION',
                title: 'Contribution Confirmed',
                message: `Your contribution of ${payload.amount} VAKS has been confirmed.`,
                metadata: {
                    campaignId: payload.campaignId,
                    transactionId: payload.transactionId,
                    amount: payload.amount,
                },
            });
            this.logger.debug('Notification created for contribution.completed');
        });

        // Wallet events — transfer sent
        this.on('wallet-events', 'transfer.completed', async (payload) => {
            // Notify sender
            await this.notificationsService.create({
                userId: payload.fromUserId,
                type: 'WALLET_TRANSFER_SENT',
                title: 'Transfer Sent',
                message: `You sent ${payload.amount} VAKS to ${payload.toUsername}.`,
                metadata: {
                    transactionId: payload.transactionId,
                    toUserId: payload.toUserId,
                    amount: payload.amount,
                },
            });

            // Notify receiver
            await this.notificationsService.create({
                userId: payload.toUserId,
                type: 'WALLET_TRANSFER_RECEIVED',
                title: 'Transfer Received',
                message: `You received ${payload.amount} VAKS from ${payload.fromUsername}.`,
                metadata: {
                    transactionId: payload.transactionId,
                    fromUserId: payload.fromUserId,
                    amount: payload.amount,
                },
            });
            this.logger.debug('Notifications created for transfer.completed');
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
