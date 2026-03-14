import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'wallet-service',
      timestamp: new Date().toISOString(),
    };
  }
}
