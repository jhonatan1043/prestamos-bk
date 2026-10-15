-- CreateEnum
CREATE TYPE "TipoArticuloEmpeno" AS ENUM ('VEHICULO', 'GENERAL');

-- CreateEnum
CREATE TYPE "EmpenoEstado" AS ENUM ('ACTIVO', 'RECUPERADO', 'VENCIDO', 'VENDIDO', 'ADJUDICADO');

-- CreateEnum
CREATE TYPE "TipoPagoEmpeno" AS ENUM ('INTERES', 'ABONO_CAPITAL', 'CANCELACION');

-- CreateEnum
CREATE TYPE "TipoMovimientoEmpeno" AS ENUM ('ENTRADA', 'REFRENDO', 'ABONO', 'SALIDA', 'CAMBIO_ESTADO', 'EDICION', 'ELIMINACION');

-- CreateTable
CREATE TABLE "Empeno" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipoArticulo" "TipoArticuloEmpeno" NOT NULL,
    "montoPrestado" DECIMAL(12,2) NOT NULL,
    "tasa" DOUBLE PRECISION NOT NULL,
    "tipoPlazo" "TipoPlazo" NOT NULL DEFAULT 'MES',
    "periodosMinimos" INTEGER NOT NULL,
    "periodosMaximos" INTEGER NOT NULL,
    "periodosPagados" INTEGER NOT NULL DEFAULT 0,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "fechaMinima" TIMESTAMP(3) NOT NULL,
    "fechaMaxima" TIMESTAMP(3) NOT NULL,
    "saldoCapital" DECIMAL(12,2) NOT NULL,
    "estado" "EmpenoEstado" NOT NULL DEFAULT 'ACTIVO',
    "fechaSalida" TIMESTAMP(3),
    "motivoSalida" TEXT,
    "montoSalida" DECIMAL(12,2),
    "codigoConsulta" TEXT NOT NULL,
    "notas" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empeno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticuloEmpeno" (
    "id" SERIAL NOT NULL,
    "empenoId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT,
    "estadoFisico" TEXT,
    "valorAvaluo" DECIMAL(12,2),
    "ubicacion" TEXT,
    "placa" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "anio" INTEGER,
    "color" TEXT,
    "numeroChasis" TEXT,
    "numeroMotor" TEXT,
    "kilometraje" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticuloEmpeno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoEmpeno" (
    "id" SERIAL NOT NULL,
    "empenoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoPagoEmpeno" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "interesAbonado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "capitalAbonado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoCapitalDespues" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "periodosCubiertos" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "deletedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagoEmpeno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoEmpeno" (
    "id" SERIAL NOT NULL,
    "empenoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoEmpeno" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalle" TEXT NOT NULL,

    CONSTRAINT "MovimientoEmpeno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empeno_codigo_key" ON "Empeno"("codigo");

-- CreateIndex
CREATE INDEX "Empeno_clienteId_idx" ON "Empeno"("clienteId");

-- CreateIndex
CREATE INDEX "Empeno_usuarioId_idx" ON "Empeno"("usuarioId");

-- CreateIndex
CREATE INDEX "Empeno_estado_fechaMaxima_idx" ON "Empeno"("estado", "fechaMaxima");

-- CreateIndex
CREATE UNIQUE INDEX "ArticuloEmpeno_empenoId_key" ON "ArticuloEmpeno"("empenoId");

-- CreateIndex
CREATE INDEX "ArticuloEmpeno_placa_idx" ON "ArticuloEmpeno"("placa");

-- CreateIndex
CREATE INDEX "PagoEmpeno_empenoId_fecha_idx" ON "PagoEmpeno"("empenoId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoEmpeno_empenoId_fecha_idx" ON "MovimientoEmpeno"("empenoId", "fecha");

-- AddForeignKey
ALTER TABLE "Empeno" ADD CONSTRAINT "Empeno_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empeno" ADD CONSTRAINT "Empeno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empeno" ADD CONSTRAINT "Empeno_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticuloEmpeno" ADD CONSTRAINT "ArticuloEmpeno_empenoId_fkey" FOREIGN KEY ("empenoId") REFERENCES "Empeno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoEmpeno" ADD CONSTRAINT "PagoEmpeno_empenoId_fkey" FOREIGN KEY ("empenoId") REFERENCES "Empeno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoEmpeno" ADD CONSTRAINT "PagoEmpeno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoEmpeno" ADD CONSTRAINT "PagoEmpeno_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoEmpeno" ADD CONSTRAINT "MovimientoEmpeno_empenoId_fkey" FOREIGN KEY ("empenoId") REFERENCES "Empeno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoEmpeno" ADD CONSTRAINT "MovimientoEmpeno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

