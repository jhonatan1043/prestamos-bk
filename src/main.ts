import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración global de CORS
  app.enableCors({
    origin: ['http://localhost:4200'], // agrega aquí los dominios permitidos
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

  await app.listen(process.env.PORT || 3000);
}

bootstrap();