import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  const frontendUrl = configService.get<string>(
    'frontendUrl',
    'http://localhost:3000',
  );
  const frontendUrls = configService.get<string>('frontendUrls', '');
  const port = configService.get<number>('port', 3001);

  const allowedOrigins = Array.from(
    new Set(
      [
        frontendUrl,
        ...frontendUrls
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
        'http://localhost',
        'http://localhost:3000',
        'http://127.0.0.1',
        'http://127.0.0.1:3000',
      ].filter(Boolean),
    ),
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('小学数学智能辅导系统 API')
    .setDescription('MVP 阶段后端接口文档')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
