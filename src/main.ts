import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as cors from 'cors';

import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: configService.get('cors.origins'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Global guards
  const reflector = app.get('Reflector');
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.useGlobalGuards(app.get(ThrottlerGuard));

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (configService.get('nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('KAIA Game API')
      .setDescription('API for KAIA Animal Space Exploration DeFi Game')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT',
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
  await app.listen(port);

  console.log(`🚀 KAIA Game API is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
