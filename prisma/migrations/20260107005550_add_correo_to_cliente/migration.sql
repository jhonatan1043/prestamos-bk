/*
  Warnings:

  - Added the required column `correo` to the `Cliente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "correo" TEXT NOT NULL;
