-- Eliminar la relación y columna estadoId de la tabla Cliente
ALTER TABLE "Cliente" DROP CONSTRAINT IF EXISTS "Cliente_estadoId_fkey";
ALTER TABLE "Cliente" DROP COLUMN IF EXISTS "estadoId";
