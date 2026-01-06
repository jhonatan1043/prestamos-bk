-- Insertar estados por defecto para prestamos y pagos
INSERT INTO "Estado" ("nombre") VALUES
  ('ACTIVO'),
  ('CANCELADO'),
  ('FINALIZADO'),
  ('MORA')
ON CONFLICT ("nombre") DO NOTHING;
