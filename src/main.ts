import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración global de CORS
  app.enableCors({
    origin: true, // agrega aquí los dominios permitidos
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Sistema de Préstamos')
    .setDescription('Documentación de la API para el sistema de préstamos')
    .setVersion('1.0')
    .addBearerAuth() // 👈 necesario para endpoints que usan JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 👈 mantiene el token al recargar
    },
  });

  // Activa las validaciones de class-validator en todos los DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // elimina campos no declarados en el DTO
    forbidNonWhitelisted: true, // lanza error si llegan campos extra
    transform: true,       // convierte tipos automáticamente (string → number, etc.)
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

}

bootstrap();