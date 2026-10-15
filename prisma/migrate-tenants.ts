import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';

/**
 * Aplica "prisma migrate deploy" al esquema principal y luego al esquema de
 * cada empresa registrada. Las empresas nuevas ya se migran al crearse
 * (SchemaProvisionerService); este script es para llevar las existentes a la
 * última versión después de un despliegue.
 *
 * Uso: npm run migrate:tenants
 */
function urlParaEsquema(schema: string): string {
  const base = process.env.DATABASE_URL ?? '';
  const url  = base.replace(/([?&])schema=[^&]*/, `$1schema=${schema}`);
  if (!url.includes(`schema=${schema}`)) {
    throw new Error(`DATABASE_URL debe incluir ?schema=... para poder apuntar a "${schema}"`);
  }
  return url;
}

function migrar(schema: string): void {
  const raiz      = process.cwd();
  const prismaBin = join(raiz, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
  execSync(`"${prismaBin}" migrate deploy`, {
    env:     { ...process.env, DATABASE_URL: urlParaEsquema(schema) },
    cwd:     raiz,
    stdio:   'pipe',
    timeout: 120_000,
  });
}

async function main() {
  const principal = process.env.MAIN_SCHEMA ?? 'master';
  const fallos: string[] = [];

  const ejecutar = (schema: string) => {
    try {
      migrar(schema);
      console.log(`✅ ${schema}`);
    } catch (err: any) {
      const detalle = err.stderr?.toString() || err.stdout?.toString() || err.message;
      console.error(`❌ ${schema}: ${detalle}`);
      fallos.push(schema);
    }
  };

  ejecutar(principal);

  const prisma = new PrismaClient({ datasources: { db: { url: urlParaEsquema(principal) } } });
  let tenants: { schemaName: string }[] = [];
  try {
    tenants = await prisma.tenant.findMany({ select: { schemaName: true }, orderBy: { id: 'asc' } });
  } finally {
    await prisma.$disconnect();
  }

  for (const { schemaName } of tenants) {
    if (schemaName !== principal) ejecutar(schemaName);
  }

  console.log(`\n${tenants.length} empresas procesadas, ${fallos.length} con error.`);
  if (fallos.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
