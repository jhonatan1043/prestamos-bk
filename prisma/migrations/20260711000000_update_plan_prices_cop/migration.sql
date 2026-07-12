-- Actualiza precios de planes de USD a COP
-- Básico: $20 USD → $80,000 COP
-- Profesional: $50 USD → $200,000 COP
-- Empresarial: $100 USD → $400,000 COP

UPDATE "master"."Plan" SET "precio" = 80000,  "duracionDias" = 30 WHERE "nombre" = 'Básico';
UPDATE "master"."Plan" SET "precio" = 200000, "duracionDias" = 30 WHERE "nombre" = 'Profesional';
UPDATE "master"."Plan" SET "precio" = 400000, "duracionDias" = 30 WHERE "nombre" = 'Empresarial';
UPDATE "master"."Plan" SET "precio" = 0,      "duracionDias" = 30 WHERE "nombre" = 'Gratuito';
