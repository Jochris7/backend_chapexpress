import { mkdirSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PRODUCT_IMAGES_DIR } from './common/constants/paths.constant';

async function bootstrap() {
  mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(configService.get<string>('PORT') ?? 3001);
}
void bootstrap();
