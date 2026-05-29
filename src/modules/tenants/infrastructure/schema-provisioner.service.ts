import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { execSync } from 'child_process';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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

    const tenantUrl = baseUrl.replace(
      /([?&])schema=[^&]*/,
      `$1schema=${schemaName}`,
    );

    if (!tenantUrl.includes(`schema=${schemaName}`)) {
      throw new InternalServerErrorException(
        `No se pudo construir DATABASE_URL para el esquema "${schemaName}"`,
      );
    }

    // Raíz del proyecto — donde está prisma/schema.prisma
    const projectRoot = process.cwd();

    // Binario de prisma desde node_modules (funciona en dev y producción sin npx)
    const isWindows = process.platform === 'win32';
    const prismaBin  = join(projectRoot, 'node_modules', '.bin', isWindows ? 'prisma.cmd' : 'prisma');

    this.logger.log(`Ejecutando migraciones en esquema: ${schemaName}`);

    try {
      execSync(`"${prismaBin}" migrate deploy`, {
        env: {
          ...process.env,
          DATABASE_URL: tenantUrl,
        },
        cwd:     projectRoot,   // prisma busca ./prisma/schema.prisma aquí
        stdio:   'pipe',
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
   * Crea el usuario admin por defecto en el esquema del tenant.
   * Usa un PrismaClient dinámico apuntando al esquema recién migrado.
   * Retorna el usuario creado con la contraseña en texto plano (solo esta vez).
   */
  async crearUsuarioAdmin(
    schemaName: string,
    nombreEmpresa: string,
  ): Promise<{ nombre: string; email: string; password: string; role: string }> {
    const baseUrl = process.env.DATABASE_URL ?? '';
    const tenantUrl = baseUrl.replace(/([?&])schema=[^&]*/, `$1schema=${schemaName}`);

    const plainPassword = this.generarPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const email = `admin@iatechsabana.online`;

    const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

    try {
      await tenantPrisma.user.create({
        data: {
          nombre: nombreEmpresa,
          email,
          password: hashedPassword,
          role: 'admin',
          active: true,
        },
      });
      this.logger.log(`Usuario admin creado en esquema "${schemaName}": ${email}`);
    } finally {
      await tenantPrisma.$disconnect();
    }

    return { nombre: nombreEmpresa, email, password: plainPassword, role: 'admin' };
  }

  /** Genera una contraseña aleatoria segura de 12 caracteres. */
  private generarPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  /**
   * Siembra los datos base en el esquema del tenant recién creado:
   *   1. Estados (ACTIVO, BORRADO) — necesarios para crear préstamos y pagos.
   *   2. Planes — copia del esquema principal para que LimitesService funcione en el esquema aislado.
   *   3. Suscripción activa — asociada al plan elegido (tenantId null, ya scopeada por esquema).
   *
   * Se llama justo después de ejecutarMigraciones.
   */
  async sembrarDatosTenant(
    schemaName: string,
    planId: number,
    tenant: { id: number; nombre: string; email: string; telefono?: string | null },
  ): Promise<void> {
    this.logger.log(`Sembrando datos base en esquema: ${schemaName}`);

    const baseUrl   = process.env.DATABASE_URL ?? '';
    const tenantUrl = baseUrl.replace(/([?&])schema=[^&]*/, `$1schema=${schemaName}`);
    const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

    try {
      // ── 1. Estados ───────────────────────────────────────────────────────────
      for (const nombre of ['ACTIVO', 'BORRADO']) {
        await tenantPrisma.estado.upsert({
          where:  { nombre },
          create: { nombre },
          update: {},
        });
      }
      this.logger.log(`  ✅ Estados sembrados en "${schemaName}"`);

      // ── 2. Planes (copiados desde el esquema principal con los mismos IDs) ────
      const planes = await this.prisma.plan.findMany({
        where:   { activo: true },
        orderBy: { id: 'asc' },
      });

      for (const p of planes) {
        await tenantPrisma.$executeRawUnsafe(
          `INSERT INTO "Plan"
            (id, nombre, descripcion, caracteristicas, "maxUsuarios", "maxClientes",
             "maxPrestamosPorCliente", precio, "duracionDias", activo, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          p.id,
          p.nombre,
          p.descripcion ?? null,
          JSON.stringify(p.caracteristicas ?? []),
          p.maxUsuarios,
          p.maxClientes,
          p.maxPrestamosPorCliente,
          Number(p.precio),
          (p as any).duracionDias ?? 30,
          p.activo,
        );
      }
      await tenantPrisma.$executeRawUnsafe(
        `SELECT setval('"Plan_id_seq"', COALESCE((SELECT MAX(id) FROM "Plan"), 1), true)`,
      );
      this.logger.log(`  ✅ ${planes.length} planes sembrados en "${schemaName}"`);

      // ── 3. Tenant (espejo del registro principal dentro del propio esquema) ───
      // Usamos el mismo ID del esquema principal para que la FK de Suscripcion coincida.
      await tenantPrisma.$executeRawUnsafe(
        `INSERT INTO "Tenant"
          (id, nombre, email, telefono, "schemaName", "planId", estado, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,'ACTIVO',NOW(),NOW())
         ON CONFLICT (id) DO UPDATE
           SET nombre=$2, email=$3, telefono=$4, "planId"=$6, "updatedAt"=NOW()`,
        tenant.id,
        tenant.nombre,
        tenant.email,
        tenant.telefono ?? null,
        schemaName,
        planId,
      );
      // Resetear secuencia del Tenant
      await tenantPrisma.$executeRawUnsafe(
        `SELECT setval('"Tenant_id_seq"', COALESCE((SELECT MAX(id) FROM "Tenant"), 1), true)`,
      );
      this.logger.log(`  ✅ Tenant #${tenant.id} "${tenant.nombre}" registrado en "${schemaName}"`);

      // ── 4. Suscripción activa vinculada al tenant ─────────────────────────────
      const plan         = planes.find(p => p.id === planId);
      const esPlanGratis = plan ? Number(plan.precio) === 0 : true;

      await tenantPrisma.suscripcion.create({
        data: {
          tenantId:    tenant.id,                      // ← ahora sí sabe a qué empresa pertenece
          planId,
          fechaInicio: new Date(),
          fechaFin:    esPlanGratis ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          estado:      'ACTIVA',
        },
      });
      this.logger.log(`  ✅ Suscripción "${plan?.nombre ?? planId}" → tenant #${tenant.id} en "${schemaName}"`);

    } finally {
      await tenantPrisma.$disconnect();
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
