import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createPinoHttpParam } from './pino-http-options';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: createPinoHttpParam(process.env),
    }),
  ],
})
export class AppLoggerModule {}
