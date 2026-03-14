"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_js_1 = require("./app.module.js");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule, new platform_fastify_1.FastifyAdapter({ logger: true }));
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true, forbidNonWhitelisted: true, transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Ledger Service — VAKS Token')
        .setDescription('On-chain VAKS token operations via Avalanche Fuji Testnet')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, config));
    await app.listen(process.env.PORT ?? 3006, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map