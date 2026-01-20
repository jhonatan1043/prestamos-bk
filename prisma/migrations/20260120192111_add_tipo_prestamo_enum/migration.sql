/*
  Warnings:

  - You are about to drop the column `correo` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `sectorId` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the `_RutasCliente` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoPrestamo" AS ENUM ('FIJO', 'SOBRE_SALDO');

-- DropForeignKey
ALTER TABLE "public"."Cliente" DROP CONSTRAINT "Cliente_sectorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ruta" DROP CONSTRAINT "Ruta_cobradorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_RutasCliente" DROP CONSTRAINT "_RutasCliente_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_RutasCliente" DROP CONSTRAINT "_RutasCliente_B_fkey";

-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "correo",
DROP COLUMN "sectorId";

-- AlterTable
ALTER TABLE "Prestamo" ADD COLUMN     "tipoPrestamo" "TipoPrestamo" NOT NULL DEFAULT 'FIJO';

-- DropTable
DROP TABLE "public"."_RutasCliente";

-- CreateTable
CREATE TABLE "Cobrador" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cobrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClienteToRuta" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ClienteToRuta_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cobrador_usuarioId_key" ON "Cobrador"("usuarioId");

-- CreateIndex
CREATE INDEX "_ClienteToRuta_B_index" ON "_ClienteToRuta"("B");

-- AddForeignKey
ALTER TABLE "Cobrador" ADD CONSTRAINT "Cobrador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruta" ADD CONSTRAINT "Ruta_cobradorId_fkey" FOREIGN KEY ("cobradorId") REFERENCES "Cobrador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClienteToRuta" ADD CONSTRAINT "_ClienteToRuta_A_fkey" FOREIGN KEY ("A") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClienteToRuta" ADD CONSTRAINT "_ClienteToRuta_B_fkey" FOREIGN KEY ("B") REFERENCES "Ruta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
