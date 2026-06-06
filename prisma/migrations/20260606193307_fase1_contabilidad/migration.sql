/*
  Warnings:

  - The `categoria` column on the `Gasto` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('OPERATIVO', 'PERSONAL', 'ADMINISTRATIVO', 'FINANCIERO', 'JURIDICO', 'OTROS');

-- AlterTable
ALTER TABLE "Gasto" DROP COLUMN "categoria",
ADD COLUMN     "categoria" "TipoGasto" NOT NULL DEFAULT 'OTROS';

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "capitalAbonado" DECIMAL(12,2),
ADD COLUMN     "interesAbonado" DECIMAL(12,2),
ADD COLUMN     "saldoCapital" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Prestamo" ADD COLUMN     "totalConIntereses" DECIMAL(12,2);
