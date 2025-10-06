-- CreateEnum
CREATE TYPE "TipoPlazo" AS ENUM ('DIA', 'SEMANA', 'MES');

-- AlterTable
ALTER TABLE "Prestamo" ADD COLUMN     "tipoPlazo" "TipoPlazo" NOT NULL DEFAULT 'DIA';
