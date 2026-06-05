import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global API prefix /api
  app.setGlobalPrefix('api');

  // Enable CORS for frontend requests
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('GOLAB Tournament API')
    .setDescription('API documentation for GOLAB team tournament platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 NestJS API started on http://localhost:${port}/api`);
  console.log(`📖 Swagger API Docs available on http://localhost:${port}/api/docs`);
}
bootstrap();
