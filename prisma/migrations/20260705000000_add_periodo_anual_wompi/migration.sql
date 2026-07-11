-- AlterTable: agrega periodoAnual a WompiTransaccion (idempotente)
ALTER TABLE "master"."WompiTransaccion" ADD COLUMN IF NOT EXISTS "periodoAnual" BOOLEAN NOT NULL DEFAULT false;
