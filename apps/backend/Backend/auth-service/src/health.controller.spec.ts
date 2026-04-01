import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('root', () => {
    it('should return health status', () => {
      const result = healthController.getHealth();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'auth-service');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
