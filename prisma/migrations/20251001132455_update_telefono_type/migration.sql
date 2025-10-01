/*
  Warnings:

  - Changed the type of `telefono` on the `Cliente` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Cliente" DROP COLUMN "telefono",
ADD COLUMN     "telefono" INTEGER NOT NULL;
