import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('should report ok when the database answers', async () => {
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;

    await expect(new HealthController(dataSource).check()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  it('should report down when the database does not answer', async () => {
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as DataSource;

    await expect(
      new HealthController(dataSource).check(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('should report down when the database is not connected', async () => {
    await expect(
      new HealthController(undefined).check(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
