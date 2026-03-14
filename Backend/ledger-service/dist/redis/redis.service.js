"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const redis_1 = require("redis");
const fs = require("fs");
function getRedisPassword() {
    const file = process.env.REDIS_PASSWORD_FILE;
    if (file && fs.existsSync(file))
        return fs.readFileSync(file, 'utf8').trim();
    return process.env.REDIS_PASSWORD ?? '';
}
let RedisService = RedisService_1 = class RedisService {
    constructor() {
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    async onModuleInit() {
        const password = getRedisPassword();
        this.client = (0, redis_1.createClient)({
            socket: { host: process.env.REDIS_HOST ?? 'redis', port: Number(process.env.REDIS_PORT ?? 6379) },
            password: password || undefined,
        });
        this.client.on('error', (err) => this.logger.error('Redis error', err));
        await this.client.connect();
        this.logger.log('Connected to Redis');
    }
    async onModuleDestroy() { await this.client?.quit(); }
    async publish(stream, event, payload) {
        await this.client.xAdd(stream, '*', { event, payload: JSON.stringify(payload) });
    }
    async ensureConsumerGroup(stream, group) {
        try {
            await this.client.xGroupCreate(stream, group, '$', { MKSTREAM: true });
        }
        catch (e) {
            if (!e.message.includes('BUSYGROUP'))
                throw e;
        }
    }
    async consumeGroup(stream, group, consumer) {
        return this.client.xReadGroup(group, consumer, [{ key: stream, id: '>' }], { COUNT: 10, BLOCK: 2000 });
    }
    async ack(stream, group, id) {
        await this.client.xAck(stream, group, id);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map