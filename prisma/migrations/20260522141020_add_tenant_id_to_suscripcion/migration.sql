/*
  Warnings:

  - Added the required column `tenantId` to the `Suscripcion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
