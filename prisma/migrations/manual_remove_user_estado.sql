-- Eliminar la relación y columna estadoId de la tabla User
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_estadoId_fkey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "estadoId";
-- Opcional: eliminar la columna usuarios en Estado si existe (en Prisma es virtual)
-- No es necesario eliminar la relación en Estado porque no hay columna física
