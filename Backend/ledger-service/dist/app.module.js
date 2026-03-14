"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_js_1 = require("./database/prisma.module.js");
const redis_module_js_1 = require("./redis/redis.module.js");
const auth_module_js_1 = require("./auth/auth.module.js");
const blockchain_module_js_1 = require("./blockchain/blockchain.module.js");
const ledger_module_js_1 = require("./ledger/ledger.module.js");
const events_module_js_1 = require("./events/events.module.js");
const health_controller_js_1 = require("./health.controller.js");
const health_service_js_1 = require("./health.service.js");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
            prisma_module_js_1.PrismaModule,
            redis_module_js_1.RedisModule,
            auth_module_js_1.AuthModule,
            blockchain_module_js_1.BlockchainModule,
            ledger_module_js_1.LedgerModule,
            events_module_js_1.EventsModule,
        ],
        controllers: [health_controller_js_1.HealthController],
        providers: [health_service_js_1.HealthService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map