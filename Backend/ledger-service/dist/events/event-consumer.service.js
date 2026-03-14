"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventConsumerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventConsumerService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_js_1 = require("../redis/redis.service.js");
const ledger_service_js_1 = require("../ledger/ledger.service.js");
let EventConsumerService = EventConsumerService_1 = class EventConsumerService {
    constructor(redis, ledger) {
        this.redis = redis;
        this.ledger = ledger;
        this.logger = new common_1.Logger(EventConsumerService_1.name);
        this.GROUP = "ledger-service";
        this.CONSUMER = "ledger-" + process.pid;
        this.subscriptions = [];
        this.running = false;
    }
    async onModuleInit() {
        this.registerHandlers();
        await this.setupConsumerGroups();
        this.startPolling();
    }
    async onModuleDestroy() { this.running = false; }
    registerHandlers() {
        this.on("wallet-events", "wallet.deposit", async (payload) => {
            await this.ledger.handleWalletDeposit(payload);
        });
    }
    on(stream, event, handler) {
        let sub = this.subscriptions.find(s => s.stream === stream);
        if (!sub) {
            sub = { stream, handlers: new Map() };
            this.subscriptions.push(sub);
        }
        sub.handlers.set(event, handler);
    }
    async setupConsumerGroups() {
        for (const sub of this.subscriptions)
            await this.redis.ensureConsumerGroup(sub.stream, this.GROUP);
    }
    startPolling() {
        this.running = true;
        for (const sub of this.subscriptions)
            this.pollStream(sub);
    }
    async pollStream(sub) {
        while (this.running) {
            try {
                const results = await this.redis.consumeGroup(sub.stream, this.GROUP, this.CONSUMER);
                if (!results)
                    continue;
                for (const entry of results) {
                    for (const msg of entry.messages) {
                        await this.processMessage(sub, msg.id, msg.message);
                    }
                }
            }
            catch (err) {
                this.logger.error("Error polling " + sub.stream, err);
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
    async processMessage(sub, id, message) {
        const event = message["event"];
        const payload = message["payload"] ? JSON.parse(message["payload"]) : {};
        const handler = sub.handlers.get(event);
        if (handler) {
            try {
                await handler(payload);
                this.logger.log("Handled " + event + " (id: " + id + ")");
            }
            catch (err) {
                this.logger.error("Failed to handle " + event, err);
            }
        }
        await this.redis.ack(sub.stream, this.GROUP, id);
    }
};
exports.EventConsumerService = EventConsumerService;
exports.EventConsumerService = EventConsumerService = EventConsumerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_js_1.RedisService,
        ledger_service_js_1.LedgerService])
], EventConsumerService);
//# sourceMappingURL=event-consumer.service.js.map