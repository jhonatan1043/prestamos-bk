-- AlterTable: agrega periodoAnual a WompiTransaccion
ALTER TABLE "master"."WompiTransaccion" ADD COLUMN "periodoAnual" BOOLEAN NOT NULL DEFAULT false;
