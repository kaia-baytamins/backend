import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cors from 'cors';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Temporarily disabled for debugging
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration using allowed origins from config
  app.use(
    cors({
      origin: configService.get('cors.origins'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-line-user-id'],
    }),
  );

  // Auth guard is configured as APP_GUARD in app.module.ts

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (configService.get('nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('KAIA Game API')
      .setDescription('API for KAIA Animal Space Exploration DeFi Game')
      .setVersion('1.0')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-line-user-id',
          in: 'header',
          description: 'LINE User ID from frontend',
        },
        'LineUserID',
      )
      .addTag('Authentication', 'Wallet-based authentication endpoints')
      .addTag('Users', 'User management and profile endpoints')
      .addTag('Pets', 'Pet management and training endpoints')
      .addTag('Spaceships', 'Spaceship management and upgrade endpoints')
      .addTag('Exploration', 'Planet exploration and mission endpoints')
      .addTag('Quests', 'DeFi quest and reward endpoints')
      .addTag('Marketplace', 'NFT and item trading endpoints')
      .addTag('Leaderboard', 'Ranking and competition endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get('port');
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 KAIA Game API is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
