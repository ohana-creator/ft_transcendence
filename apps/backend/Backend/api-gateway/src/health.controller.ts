import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';
import { ProxyService } from './proxy/proxy.service.js';

@Controller()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly proxyService: ProxyService,
  ) {}

  @Get('health')
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('health/metrics')
  getMetrics() {
    return {
      httpStatusBuckets: this.proxyService.getMetrics(),
    };
  }
}
