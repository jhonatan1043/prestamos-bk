-- CreateEnum
CREATE TYPE "TipoPlazo" AS ENUM ('DIA', 'SEMANA', 'MES');

-- CreateEnum
CREATE TYPE "TipoPrestamo" AS ENUM ('FIJO', 'SOBRE_SALDO');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "tipoIdentificacion" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "sectorId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "correo" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "fechaNacimiento" DATE,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestamo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "tasa" DOUBLE PRECISION NOT NULL,
    "plazoDias" INTEGER NOT NULL,
    "tipoPlazo" "TipoPlazo" NOT NULL DEFAULT 'DIA',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "estadoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipoPrestamo" "TipoPrestamo" NOT NULL DEFAULT 'FIJO',

    CONSTRAINT "Prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "prestamoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estadoId" INTEGER NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estado" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "categoria" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "cobradorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "ruc" VARCHAR(50) NOT NULL,
    "direccion" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(50) NOT NULL,
    "correo" VARCHAR(255) NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "divisa" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "codigoPais" VARCHAR(10) NOT NULL DEFAULT 'CO',

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClienteToRuta" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_identificacion_key" ON "Cliente"("identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "Prestamo_codigo_key" ON "Prestamo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Estado_nombre_key" ON "Estado"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_ruc_key" ON "Empresa"("ruc");

-- CreateIndex
CREATE INDEX "_ClienteToRuta_B_index" ON "_ClienteToRuta"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ClienteToRuta_AB_unique" ON "_ClienteToRuta"("A", "B");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "Estado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "Prestamo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "Estado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruta" ADD CONSTRAINT "Ruta_cobradorId_fkey" FOREIGN KEY ("cobradorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClienteToRuta" ADD CONSTRAINT "_ClienteToRuta_A_fkey" FOREIGN KEY ("A") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClienteToRuta" ADD CONSTRAINT "_ClienteToRuta_B_fkey" FOREIGN KEY ("B") REFERENCES "Ruta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
