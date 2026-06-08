import { Global, Module, OnModuleInit } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Módulo global de correo — disponible en toda la aplicación
 * sin necesidad de importarlo explícitamente en cada módulo.
 *
 * Al arrancar verifica la conexión SMTP y lo registra en los logs.
 * Si el SMTP no está disponible, la app sigue funcionando (correo falla silenciosamente).
 */
@Global()
@Module({
  providers: [MailService],
  exports:   [MailService],
})
export class MailModule implements OnModuleInit {
  constructor(private readonly mailService: MailService) {}

  async onModuleInit(): Promise<void> {
    // Verificar SMTP en background — no bloquea el arranque
    this.mailService.verificarConexion().catch(() => { /* ya logueado internamente */ });
  }
}
