import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEstados() {
  const estados = ['ACTIVO', 'BORRADO', 'FINALIZADO', 'CANCELADO'];
  for (const nombre of estados) {
    const exists = await prisma.estado.findUnique({ where: { nombre } });
    if (!exists) {
      await prisma.estado.create({ data: { nombre } });
      console.log(`  ✅ Estado creado: ${nombre}`);
    } else {
      console.log(`  ⏭️  Estado ya existe: ${nombre}`);
    }
  }
}

async function seedPlanes() {
  const planes = [
    {
      nombre: 'Gratuito',
      descripcion: 'Ideal para empezar a gestionar tus préstamos sin costo.',
      caracteristicas: [
        '1 usuario',
        '20 clientes',
        '5 préstamos por cliente',
        'Soporte por email',
      ],
      maxUsuarios: 1,
      maxClientes: 20,
      maxPrestamosPorCliente: 5,
      precio: 0.00,
      duracionDias: 30,
      activo: true,
    },
    {
      nombre: 'Básico',
      descripcion: 'Para pequeños negocios que están creciendo.',
      caracteristicas: [
        '5 usuarios',
        '100 clientes',
        '20 préstamos por cliente',
        'Reportes básicos',
        'Soporte por email',
      ],
      maxUsuarios: 5,
      maxClientes: 100,
      maxPrestamosPorCliente: 20,
      precio: 20.00,
      duracionDias: 30,
      activo: true,
    },
    {
      nombre: 'Profesional',
      descripcion: 'Para negocios en expansión con mayor volumen de operaciones.',
      caracteristicas: [
        '10 usuarios',
        '200 clientes',
        '50 préstamos por cliente',
        'Reportes avanzados',
        'Soporte prioritario',
        'Exportación de datos',
      ],
      maxUsuarios: 10,
      maxClientes: 200,
      maxPrestamosPorCliente: 50,
      precio: 50.00,
      duracionDias: 30,
      activo: true,
    },
    {
      nombre: 'Empresarial',
      descripcion: 'Para grandes operaciones sin límite de préstamos por cliente.',
      caracteristicas: [
        '20 usuarios',
        '300 clientes',
        'Préstamos ilimitados por cliente',
        'Reportes avanzados',
        'Soporte 24/7',
        'Exportación de datos',
        'Acceso a API',
      ],
      maxUsuarios: 20,
      maxClientes: 300,
      maxPrestamosPorCliente: -1,
      precio: 100.00,
      duracionDias: 30,
      activo: true,
    },
  ];

  for (const plan of planes) {
    const exists = await prisma.plan.findUnique({ where: { nombre: plan.nombre } });
    if (exists) {
      await prisma.plan.update({ where: { nombre: plan.nombre }, data: plan });
      console.log(`  ✏️  Plan actualizado: ${plan.nombre} ($${plan.precio})`);
    } else {
      await prisma.plan.create({ data: plan });
      console.log(`  ✅ Plan creado: ${plan.nombre} ($${plan.precio})`);
    }
  }
}

async function main() {
  console.log('\n🌱 Iniciando seeder...\n');

  console.log('📋 Estados:');
  await seedEstados();

  console.log('\n💳 Planes:');
  await seedPlanes();

  console.log('\n✅ Seeder completado.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
