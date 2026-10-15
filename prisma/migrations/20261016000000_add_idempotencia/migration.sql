-- CreateTable
CREATE TABLE "SolicitudIdempotente" (
    "clave" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "estado" TEXT NOT NULL,
    "status" INTEGER,
    "respuesta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudIdempotente_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE INDEX "SolicitudIdempotente_createdAt_idx" ON "SolicitudIdempotente"("createdAt");

