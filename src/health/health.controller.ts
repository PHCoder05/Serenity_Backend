import {
  Controller,
  Get,
  Inject,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Optional()
    @Inject(DataSource)
    private readonly dataSource?: DataSource,
  ) {}

  @Get()
  async check(): Promise<{ status: 'ok'; database: 'ok' }> {
    if (!this.dataSource?.isInitialized) {
      this.logger.error('Health check failed: database is not connected');
      throw new ServiceUnavailableException({
        status: 'down',
        database: 'down',
      });
    }

    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'query failed';
      this.logger.error(`Health check failed: ${message}`);
      throw new ServiceUnavailableException({
        status: 'down',
        database: 'down',
      });
    }

    return { status: 'ok', database: 'ok' };
  }
}
