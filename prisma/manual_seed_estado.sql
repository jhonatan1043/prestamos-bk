-- Insertar estados por defecto para prestamos y pagos
INSERT INTO tst."Estado" ("nombre") values('ACTIVO');
INSERT INTO tst."Estado" ("nombre") values('CANCELADO');
INSERT INTO tst."Estado" ("nombre") values('FINALIZADO');
INSERT INTO tst."Estado" ("nombre") values('MORA');
ON CONFLICT ("nombre") DO NOTHING;
