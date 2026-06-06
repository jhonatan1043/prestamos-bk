import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Módulo global de correo — disponible en toda la aplicación
 * sin necesidad de importarlo explícitamente en cada módulo.
 */
@Global()
@Module({
  providers: [MailService],
  exports:   [MailService],
})
export class MailModule {}
