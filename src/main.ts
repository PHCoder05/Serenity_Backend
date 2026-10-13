import 'dotenv/config';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import validationOptions from './utils/validation-options';
import { AllConfigType } from './config/config.type';
import { ResolvePromisesInterceptor } from './utils/serializer.interceptor';
import { randomUUID } from 'crypto';
import { assertProductionBoot, isCorsOriginAllowed } from './boot-guards';

function corsOriginAllowed(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  callback(null, isCorsOriginAllowed(origin, process.env));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.enableCors({ origin: corsOriginAllowed });
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);

  app.enableShutdownHooks();
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.use((req: any, res: any, next: () => void) => {
    const correlationId =
      req.headers['x-correlation-id']?.toString() ?? randomUUID();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  });
  const isProduction =
    (configService.get('app.nodeEnv', { infer: true }) || '').toLowerCase() ===
    'production';
  assertProductionBoot(process.env);

  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (!isProduction && process.env.SWAGGER_ENABLED !== 'false');
  if (swaggerEnabled) {
    app.use('/docs-json', (_req: any, res: any, next: () => void) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      next();
    });
    app.use('/docs', (_req: any, res: any, next: () => void) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      next();
    });
  }
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  if (swaggerEnabled) {
    const options = new DocumentBuilder()
      .setTitle('API')
      .setDescription('API docs')
      .setVersion('1.0')
      .addBearerAuth()
      .addGlobalParameters({
        in: 'header',
        required: false,
        name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
        schema: {
          example: 'en',
        },
      })
      .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}
void bootstrap();
