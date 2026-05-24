-- CreateTable
CREATE TABLE "WompiTransaccion" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "email" TEXT NOT NULL,
    "tenantNombre" TEXT,
    "tenantId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "wompiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WompiTransaccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WompiTransaccion_reference_key" ON "WompiTransaccion"("reference");
