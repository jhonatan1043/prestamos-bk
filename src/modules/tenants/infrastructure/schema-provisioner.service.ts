import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { execSync } from 'child_process';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class SchemaProvisionerService {
  private readonly logger = new Logger(SchemaProvisionerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera un nombre de esquema único a partir del nombre del tenant.
   * Ej: "Acme Corp" → "tenant_acme_corp"
   */
  generateSchemaName(nombre: string, suffix?: string): string {
    const slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quitar tildes
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 40);

    const base = `tenant_${slug}`;
    return suffix ? `${base}_${suffix}` : base;
  }

  /**
   * Crea el esquema PostgreSQL si no existe.
   */
  async crearEsquema(schemaName: string): Promise<void> {
    this.logger.log(`Creando esquema PostgreSQL: ${schemaName}`);
    await this.prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
    );
    this.logger.log(`Esquema "${schemaName}" listo.`);
  }

  /**
   * Ejecuta "prisma migrate deploy" apuntando al esquema del tenant.
   * Usa DATABASE_URL con ?schema=<schemaName> para aislar las tablas.
   */
  async ejecutarMigraciones(schemaName: string): Promise<void> {
    const baseUrl = process.env.DATABASE_URL ?? '';

    // Reemplazar el parámetro ?schema=... con el nuevo esquema
    const tenantUrl = baseUrl.replace(
      /([?&])schema=[^&]*/,
      `$1schema=${schemaName}`,
    );

    if (!tenantUrl.includes(`schema=${schemaName}`)) {
      throw new InternalServerErrorException(
        `No se pudo construir DATABASE_URL para el esquema "${schemaName}"`,
      );
    }

    this.logger.log(`Ejecutando migraciones en esquema: ${schemaName}`);

    try {
      execSync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: tenantUrl,
        },
        stdio: 'pipe',
        timeout: 120_000,
      });
      this.logger.log(`Migraciones aplicadas en "${schemaName}".`);
    } catch (error: any) {
      const output = error.stdout?.toString() ?? '';
      const stderr = error.stderr?.toString() ?? '';
      this.logger.error(
        `Error al migrar esquema "${schemaName}": ${stderr || output}`,
      );
      throw new InternalServerErrorException(
        `Falló la migración del esquema "${schemaName}": ${stderr || error.message}`,
      );
    }
  }

  /**
   * Elimina el esquema PostgreSQL y todo su contenido.
   * ¡Operación destructiva! Usar solo al cancelar/eliminar un tenant.
   */
  async eliminarEsquema(schemaName: string): Promise<void> {
    this.logger.warn(`Eliminando esquema PostgreSQL: ${schemaName}`);
    await this.prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    this.logger.warn(`Esquema "${schemaName}" eliminado.`);
  }
}
