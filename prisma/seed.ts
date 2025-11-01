import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crea el estado ACTIVO si no existe
  const activo = await prisma.estado.findUnique({ where: { nombre: 'ACTIVO' } });
  if (!activo) {
    await prisma.estado.create({ data: { nombre: 'ACTIVO' } });
  }
  // Crea el estado BORRADO si no existe
  const borrado = await prisma.estado.findUnique({ where: { nombre: 'BORRADO' } });
  if (!borrado) {
    await prisma.estado.create({ data: { nombre: 'BORRADO' } });
  }
  console.log('Estados semilla insertados');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
