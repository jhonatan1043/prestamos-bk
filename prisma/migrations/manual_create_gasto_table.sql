-- CreateTable
CREATE TABLE "Gasto" (
  "id" SERIAL PRIMARY KEY,
  "descripcion" VARCHAR(255) NOT NULL,
  "monto" DECIMAL(12,2) NOT NULL,
  "fecha" TIMESTAMP NOT NULL,
  "categoria" VARCHAR(255) NOT NULL,
  "active" BOOLEAN DEFAULT true,
  "usuarioId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "fk_usuario" FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);
