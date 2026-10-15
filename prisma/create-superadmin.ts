import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Crea (o actualiza) el usuario superadmin de la plataforma en el esquema
 * principal (MAIN_SCHEMA). Para iniciar sesión como superadmin se usa
 * schemaName = MAIN_SCHEMA en POST /auth/login.
 *
 * Uso:
 *   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run superadmin:create
 */
async function main() {
  const email    = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const nombre   = process.env.SUPERADMIN_NOMBRE ?? 'Superadmin';

  if (!email || !password) {
    throw new Error('Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD');
  }
  if (password.length < 12) {
    throw new Error('SUPERADMIN_PASSWORD debe tener al menos 12 caracteres');
  }

  const schema = process.env.MAIN_SCHEMA ?? 'master';
  const url    = (process.env.DATABASE_URL ?? '').replace(/([?&])schema=[^&]*/, `$1schema=${schema}`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where:  { email },
      update: { password: hash, role: 'superadmin', active: true, nombre },
      create: { email, password: hash, role: 'superadmin', active: true, nombre },
    });
    console.log(`✅ Superadmin listo en el esquema "${schema}": ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
