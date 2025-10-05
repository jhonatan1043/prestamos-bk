-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'ACTIVO';

-- AlterTable
ALTER TABLE "Prestamo" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'ACTIVO';
