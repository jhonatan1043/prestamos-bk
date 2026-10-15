# Empeños (1/3) — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a `prestamos-bk` el módulo `/empenos` (empeños de vehículos y artículos, con intereses, pagos, refrendos, salidas, soft delete, auditoría y portal del cliente) sin cambiar el comportamiento de ningún endpoint existente.

**Architecture:** Módulo NestJS nuevo `src/modules/empenos`. La lógica de dinero y fechas vive en funciones puras (`domain/`) con pruebas unitarias. El estado del empeño (saldo, periodos pagados, fecha máxima) se **reconstruye reproduciendo los pagos no eliminados**, así crear, editar o eliminar un pago siempre deja datos coherentes. Los servicios usan `TenantPrismaService` directamente (como `PaymentsService`/`SuscripcionService`), y los permisos usan `RolesGuard` de `fix/seguridad-roles`.

**Tech Stack:** NestJS 11, Prisma 6 (PostgreSQL, un esquema por empresa), class-validator, Jest + ts-jest (`npm test`, specs en `src/**/*.spec.ts`).

**Spec:** `docs/superpowers/specs/2026-10-15-empenos-design.md`

## Global Constraints

- Rama: crear `feature/empenos` desde `fix/seguridad-roles`. No hacer push sin que el usuario lo pida.
- **Solo cambios aditivos.** Archivos existentes que se pueden tocar: `prisma/schema.prisma` (modelos y enums nuevos + relaciones inversas en `Cliente` y `User`), `src/app.module.ts` (registrar módulo), `src/common/audit/audit-log.service.ts` (acciones nuevas), `package.json` (script `migrate:tenants`). Nada más.
- `tasa`: % **por periodo**, 1–100. `tipoPlazo` reutiliza el enum `TipoPlazo` (DIA, SEMANA, MES), por defecto MES.
- Interés **por periodo iniciado sobre `saldoCapital`**; MES = mes calendario; montos redondeados a 2 decimales.
- `usuarioId` siempre de `req.user.id`, nunca del body.
- Visibilidad: admin (`esAdmin(req.user)`) ve todo; cualquier otro rol solo `usuarioId = req.user.id`, en **todas** las lecturas y escrituras (lo ajeno responde 404).
- Editar = rol admin. Eliminar = rol admin **y** cabecera `X-Client: admin-web`. Soft delete con `deletedAt` + `deletedById`; nunca `delete()` físico.
- Códigos: `EMP-000001` (6 dígitos, secuencial por esquema). `codigoConsulta`: 6 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` con `crypto.randomInt`.
- Mensajes de error y Swagger en español, como el resto del backend.
- **Nunca** ejecutar migraciones contra la base del `.env` (apunta a un servidor remoto, posiblemente producción). La migración SQL se genera con `prisma migrate diff`, que no necesita base de datos.

## Review Focus

1. **Cancelación antes de la fecha mínima** → debe cobrar `periodosMinimos` completos, no los días transcurridos. *(Test en Task 2.)*
2. **Fin de mes** (ingreso 31-ene, plazo MES) → el periodo vence el 28/29-feb, no el 3-mar. *(Test en Task 2.)*
3. **Editar o eliminar un pago antiguo** cuando hay pagos posteriores → se reconstruye todo; si la secuencia queda inválida (p. ej. un abono que ya no cubre el interés), responde 400 y no guarda nada. *(Test en Task 2 y Task 6.)*
4. **Cobrador que adivina el id** de un empeño ajeno en `GET /empenos/:id`, `POST /empenos/:id/pagos` o `/liquidacion` → 404. *(Test en Task 5.)*
5. **Portal con cédula correcta y código de otra persona** → 404 genérico, y tras 10 intentos fallidos por IP en 15 min → 429. *(Test en Task 8.)*

---

## File Structure

```
prisma/
  schema.prisma                                   (modify) modelos Empeno, ArticuloEmpeno, PagoEmpeno, MovimientoEmpeno + enums
  migrations/20261015000000_add_empenos_module/migration.sql   (create)
  migrate-tenants.ts                              (create) aplica migraciones a todos los esquemas de empresas
src/common/auth/admin-web.guard.ts (+ .spec.ts)   (create) exige X-Client: admin-web
src/common/audit/audit-log.service.ts             (modify) acciones EMPENO_*
src/modules/empenos/
  domain/periodos.ts (+ .spec.ts)                 sumarPeriodos, periodosIniciados
  domain/liquidacion.ts (+ .spec.ts)              reconstruirEstado, liquidar
  domain/estado.ts (+ .spec.ts)                   estadoEfectivo, puedeRegistrarSalida
  domain/codigos.ts (+ .spec.ts)                  siguienteCodigo, generarCodigoConsulta
  application/dto/*.ts                            DTOs de entrada
  application/empenos.service.ts (+ .spec.ts)     CRUD, visibilidad, soft delete, movimientos
  application/empeno-pagos.service.ts (+ .spec.ts) pagos, refrendo, abono, cancelación, salida, liquidación
  application/empeno-reportes.service.ts (+ .spec.ts) resumen, por cliente, movimientos
  application/empeno-portal.service.ts (+ .spec.ts) consulta pública + límite de intentos
  presentation/empenos.controller.ts
  presentation/empenos-portal.controller.ts
  empenos.module.ts
src/app.module.ts                                 (modify) importar EmpenosModule
```

---

### Task 1: Esquema Prisma, migración y script para empresas existentes

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261015000000_add_empenos_module/migration.sql`
- Create: `prisma/migrate-tenants.ts`
- Modify: `package.json` (script)

**Interfaces:**
- Produces: modelos Prisma `Empeno`, `ArticuloEmpeno`, `PagoEmpeno`, `MovimientoEmpeno`; enums `TipoArticuloEmpeno { VEHICULO GENERAL }`, `EmpenoEstado { ACTIVO RECUPERADO VENCIDO VENDIDO ADJUDICADO }`, `TipoPagoEmpeno { INTERES ABONO_CAPITAL CANCELACION }`, `TipoMovimientoEmpeno { ENTRADA REFRENDO ABONO SALIDA CAMBIO_ESTADO EDICION ELIMINACION }`. Delegates `tenantPrisma.client.empeno` etc.

- [ ] **Step 1: Crear la rama**

```bash
git checkout fix/seguridad-roles && git pull --ff-only && git checkout -b feature/empenos
```

- [ ] **Step 2: Añadir modelos al `schema.prisma`** con los campos del spec §5, más estos campos que el spec deja al implementador:
  - `Empeno.periodosPagados Int @default(0)` — periodos cuyo interés ya se pagó (lo mantiene `reconstruirEstado`).
  - `Empeno.articulo ArticuloEmpeno?` (1:1, `ArticuloEmpeno.empenoId Int @unique`).
  - `PagoEmpeno`: `interesAbonado`, `capitalAbonado`, `saldoCapitalDespues` como `Decimal(12,2)`; `periodosCubiertos Int @default(0)`.
  - Índices: `@@index([clienteId])`, `@@index([usuarioId])`, `@@index([estado, fechaMaxima])` en `Empeno`; `@@index([placa])` en `ArticuloEmpeno`; `@@index([empenoId, fecha])` en `PagoEmpeno` y `MovimientoEmpeno`.
  - Relaciones inversas: `Cliente.empenos Empeno[]`; en `User`, relaciones con nombre: `@relation("EmpenoUsuario")`, `@relation("EmpenoEliminadoPor")`, `@relation("PagoEmpenoUsuario")`, `@relation("MovimientoEmpenoUsuario")`.
  - FK `onDelete: Restrict` en todas, como `Prestamo`.
  - `@@map` con el mismo nombre del modelo, como el resto.

- [ ] **Step 3: Validar el esquema**

Run: `npx prisma validate && npx prisma generate`
Expected: `The schema at prisma/schema.prisma is valid` y cliente generado sin errores.

- [ ] **Step 4: Generar la migración SIN base de datos**

```bash
git show HEAD:prisma/schema.prisma > /tmp/schema.old.prisma
mkdir -p prisma/migrations/20261015000000_add_empenos_module
npx prisma migrate diff --from-schema-datamodel /tmp/schema.old.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261015000000_add_empenos_module/migration.sql
```
Expected: el SQL contiene solo `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX` y `ALTER TABLE ... ADD CONSTRAINT` de tablas **nuevas**. Si aparece cualquier `ALTER`/`DROP` sobre tablas existentes, detenerse y revisar el Step 2.

- [ ] **Step 5: Crear `prisma/migrate-tenants.ts`**

Lee todos los `Tenant` del esquema principal (`MAIN_SCHEMA`) y, para cada `schemaName`, ejecuta `prisma migrate deploy` con `DATABASE_URL` apuntando a ese esquema, con la misma técnica de `SchemaProvisionerService.ejecutarMigraciones` (reemplazo de `schema=` y `execSync` del binario local). Primero migra el esquema principal. Imprime `✅ <schema>` o `❌ <schema>: <error>`, continúa con los demás y termina con exit code 1 si alguno falló. Añade `"migrate:tenants": "ts-node prisma/migrate-tenants.ts"` a `scripts`.

- [ ] **Step 6: Compilar**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261015000000_add_empenos_module prisma/migrate-tenants.ts package.json
git commit -m "feat(empenos): modelos, migración y script de migración por empresa"
```

---

### Task 2: Periodos y liquidación (funciones puras)

**Files:**
- Create: `src/modules/empenos/domain/periodos.ts`, `periodos.spec.ts`
- Create: `src/modules/empenos/domain/liquidacion.ts`, `liquidacion.spec.ts`

**Interfaces:**
- Produces:
  - `type Plazo = 'DIA' | 'SEMANA' | 'MES'`
  - `sumarPeriodos(fecha: Date, n: number, plazo: Plazo): Date` — DIA +n días, SEMANA +7n días, MES +n meses calendario con día limitado al último del mes destino.
  - `periodosIniciados(inicio: Date, corte: Date, plazo: Plazo): number` — el menor `n ≥ 1` tal que `sumarPeriodos(inicio, n) >= corte` (si `corte <= inicio`, devuelve 1).
  - `redondear(n: number): number` — 2 decimales, `Math.round(n * 100) / 100`.
  - `interface DatosEmpeno { montoPrestado: number; tasa: number; tipoPlazo: Plazo; periodosMinimos: number; periodosMaximos: number; fechaIngreso: Date }`
  - `interface PagoParaReplay { id?: number; tipo: 'INTERES'|'ABONO_CAPITAL'|'CANCELACION'; monto: number; fecha: Date; periodosCubiertos: number }`
  - `interface EstadoCalculado { saldoCapital: number; periodosPagados: number; fechaMaxima: Date; cancelado: boolean; desglose: Array<{ id?: number; interesAbonado: number; capitalAbonado: number; saldoCapitalDespues: number }> }`
  - `reconstruirEstado(e: DatosEmpeno, pagos: PagoParaReplay[]): EstadoCalculado` — lanza `ErrorLiquidacion` (clase exportada, `extends Error`) si algún pago es inválido.
  - `interface Liquidacion { periodosTranscurridos: number; periodosAdeudados: number; interesPorPeriodo: number; interesAdeudado: number; saldoCapital: number; totalParaRescatar: number; fechaMinima: Date; fechaMaxima: Date }`
  - `liquidar(e: DatosEmpeno, estado: EstadoCalculado, corte: Date): Liquidacion`

**Reglas de `reconstruirEstado`** (procesa los pagos ordenados por `fecha` y luego `id`; estado inicial `saldo = montoPrestado`, `pagados = 0`, `fechaMaxima = sumarPeriodos(ingreso, periodosMaximos)`):
- Interés del periodo = `redondear(saldo × tasa / 100)`. `iniciados = periodosIniciados(ingreso, pago.fecha)`. `adeudados = max(iniciados − pagados, 0)`.
- `INTERES` (refrendo): `periodosCubiertos ≥ max(adeudados, 1)` y `monto === redondear(periodosCubiertos × interésPeriodo)`. Después: `pagados += periodosCubiertos`, `fechaMaxima = sumarPeriodos(fechaMaxima, periodosCubiertos)`, capital 0.
- `ABONO_CAPITAL`: `interés = adeudados × interésPeriodo`; exige `monto > interés` y `monto − interés < saldo`. Después: `pagados = max(pagados, iniciados)`, `saldo −= monto − interés`.
- `CANCELACION`: `aCobrar = max(adeudados, periodosMinimos − pagados, 0)`; exige `monto === redondear(saldo + aCobrar × interésPeriodo)`. Después: saldo 0, `cancelado = true`. Ningún pago puede venir después de una cancelación.

**Reglas de `liquidar`:** `periodosTranscurridos = periodosIniciados(ingreso, corte)`; `periodosAdeudados = max(transcurridos − pagados, 0)`; `totalParaRescatar = saldo + max(adeudados, periodosMinimos − pagados, 0) × interésPeriodo`; `fechaMinima = sumarPeriodos(ingreso, periodosMinimos)`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// periodos.spec.ts
it('MES respeta fin de mes', () => {
  expect(sumarPeriodos(new Date('2026-01-31T12:00:00Z'), 1, 'MES').toISOString().slice(0,10)).toBe('2026-02-28');
  expect(sumarPeriodos(new Date('2028-01-31T12:00:00Z'), 1, 'MES').toISOString().slice(0,10)).toBe('2028-02-29');
});
it('periodo iniciado: 40 días en MES = 2', () => {
  expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-02-10'), 'MES')).toBe(2);
});
it('el mismo día del ingreso cuenta 1 periodo', () => {
  expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-01-01'), 'MES')).toBe(1);
});
it('SEMANA y DIA', () => {
  expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-01-09'), 'SEMANA')).toBe(2);
  expect(periodosIniciados(new Date('2026-01-01'), new Date('2026-01-04'), 'DIA')).toBe(3);
});

// liquidacion.spec.ts — base: 1.000.000 al 5 % MES, mínimo 2, máximo 4, ingreso 2026-01-01
const base = { montoPrestado: 1_000_000, tasa: 5, tipoPlazo: 'MES', periodosMinimos: 2, periodosMaximos: 4, fechaIngreso: new Date('2026-01-01') } as const;
it('a los 40 días debe 2 meses: 100.000', () => {
  const l = liquidar(base, reconstruirEstado(base, []), new Date('2026-02-10'));
  expect(l.interesAdeudado).toBe(100_000);
  expect(l.totalParaRescatar).toBe(1_100_000);
});
it('rescate a los 10 días cobra el mínimo (2 periodos)', () => {
  const l = liquidar(base, reconstruirEstado(base, []), new Date('2026-01-11'));
  expect(l.totalParaRescatar).toBe(1_100_000);
});
it('refrendo de 1 periodo corre la fecha máxima 1 mes', () => {
  const e = reconstruirEstado(base, [{ tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-01-15'), periodosCubiertos: 1 }]);
  expect(e.fechaMaxima.toISOString().slice(0,10)).toBe('2026-06-01');
  expect(e.periodosPagados).toBe(1);
});
it('abono cubre interés vencido y baja capital', () => {
  const e = reconstruirEstado(base, [{ tipo: 'ABONO_CAPITAL', monto: 300_000, fecha: new Date('2026-02-10'), periodosCubiertos: 0 }]);
  expect(e.desglose[0]).toEqual({ id: undefined, interesAbonado: 100_000, capitalAbonado: 200_000, saldoCapitalDespues: 800_000 });
  expect(liquidar(base, e, new Date('2026-03-05')).interesPorPeriodo).toBe(40_000);
});
it('cancelación con monto incorrecto lanza ErrorLiquidacion', () => {
  expect(() => reconstruirEstado(base, [{ tipo: 'CANCELACION', monto: 1_000_000, fecha: new Date('2026-01-05'), periodosCubiertos: 0 }])).toThrow(ErrorLiquidacion);
});
it('no admite pagos después de una cancelación', () => {
  expect(() => reconstruirEstado(base, [
    { tipo: 'CANCELACION', monto: 1_100_000, fecha: new Date('2026-01-05'), periodosCubiertos: 0 },
    { tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-01-06'), periodosCubiertos: 1 },
  ])).toThrow(ErrorLiquidacion);
});
it('refrendo que no cubre lo adeudado lanza error', () => {
  expect(() => reconstruirEstado(base, [{ tipo: 'INTERES', monto: 50_000, fecha: new Date('2026-03-15'), periodosCubiertos: 1 }])).toThrow(ErrorLiquidacion);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx jest src/modules/empenos/domain`
Expected: FAIL (`Cannot find module './periodos'`).

- [ ] **Step 3: Implementar `periodos.ts` y `liquidacion.ts`** con las firmas y reglas de arriba. Toda la aritmética de fechas en UTC (`getUTCFullYear`/`setUTCMonth`, etc.).

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `npx jest src/modules/empenos/domain`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/empenos/domain
git commit -m "feat(empenos): cálculo de periodos e intereses con pruebas"
```

---

### Task 3: Estado efectivo y códigos (funciones puras)

**Files:**
- Create: `src/modules/empenos/domain/estado.ts`, `estado.spec.ts`
- Create: `src/modules/empenos/domain/codigos.ts`, `codigos.spec.ts`

**Interfaces:**
- Produces:
  - `type EstadoEmpeno = 'ACTIVO'|'RECUPERADO'|'VENCIDO'|'VENDIDO'|'ADJUDICADO'`
  - `estadoEfectivo(estado: EstadoEmpeno, fechaMaxima: Date, ahora: Date): EstadoEmpeno` — `ACTIVO` con `ahora > fechaMaxima` ⇒ `VENCIDO`; `VENCIDO` con `ahora <= fechaMaxima` (tras un refrendo) ⇒ `ACTIVO`; los finales no cambian.
  - `esFinal(estado: EstadoEmpeno): boolean` — RECUPERADO, VENDIDO, ADJUDICADO.
  - `puedeRegistrarSalida(estadoEf: EstadoEmpeno): boolean` — solo `VENCIDO`.
  - `siguienteCodigo(ultimo: string | null): string` — `null` ⇒ `EMP-000001`; `EMP-000123` ⇒ `EMP-000124`.
  - `generarCodigoConsulta(): string` — 6 caracteres del alfabeto de Global Constraints.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
it('ACTIVO pasada la fecha máxima es VENCIDO', () => expect(estadoEfectivo('ACTIVO', new Date('2026-01-01'), new Date('2026-01-02'))).toBe('VENCIDO'));
it('VENCIDO refrendado vuelve a ACTIVO', () => expect(estadoEfectivo('VENCIDO', new Date('2026-05-01'), new Date('2026-04-01'))).toBe('ACTIVO'));
it('RECUPERADO no cambia', () => expect(estadoEfectivo('RECUPERADO', new Date('2020-01-01'), new Date())).toBe('RECUPERADO'));
it('salida solo si VENCIDO', () => { expect(puedeRegistrarSalida('VENCIDO')).toBe(true); expect(puedeRegistrarSalida('ACTIVO')).toBe(false); });
it('códigos secuenciales', () => { expect(siguienteCodigo(null)).toBe('EMP-000001'); expect(siguienteCodigo('EMP-000123')).toBe('EMP-000124'); });
it('código de consulta', () => expect(generarCodigoConsulta()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/));
```

- [ ] **Step 2: Run** `npx jest src/modules/empenos/domain/estado src/modules/empenos/domain/codigos` → FAIL.
- [ ] **Step 3: Implementar** `estado.ts` y `codigos.ts` (`crypto.randomInt`).
- [ ] **Step 4: Run** el mismo comando → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): estado efectivo y generación de códigos"`

---

### Task 4: Guard de panel web y acciones de auditoría

**Files:**
- Create: `src/common/auth/admin-web.guard.ts`, `admin-web.guard.spec.ts`
- Modify: `src/common/audit/audit-log.service.ts` (añadir al objeto `AuditAction`)

**Interfaces:**
- Produces: `AdminWebGuard implements CanActivate` — lanza `ForbiddenException('Esta acción solo está disponible desde el panel de administración')` si `req.headers['x-client'] !== 'admin-web'`. Acciones `EMPENO_CREAR`, `EMPENO_ACTUALIZAR`, `EMPENO_ELIMINAR`, `EMPENO_SALIDA`, `EMPENO_REFRENDO`, `PAGO_EMPENO_CREAR`, `PAGO_EMPENO_ACTUALIZAR`, `PAGO_EMPENO_ELIMINAR`.

- [ ] **Step 1: Prueba que falla** — con cabecera `admin-web` → `true`; sin cabecera o con `app` → `ForbiddenException`.
- [ ] **Step 2: Run** `npx jest src/common/auth/admin-web` → FAIL.
- [ ] **Step 3: Implementar** el guard y añadir las acciones.
- [ ] **Step 4: Run** `npx jest src/common/auth/admin-web && npm run build` → PASS / build OK.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): guard de panel web y acciones de auditoría"`

---

### Task 5: Servicio de empeños (crear, listar, ver, editar, soft delete, visibilidad)

**Files:**
- Create: `src/modules/empenos/application/dto/create-empeno.dto.ts`, `update-empeno.dto.ts`, `articulo-empeno.dto.ts`, `filtros-empeno.dto.ts`
- Create: `src/modules/empenos/application/empenos.service.ts`, `empenos.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 (`reconstruirEstado`, `liquidar`, `sumarPeriodos`), Task 3 (`estadoEfectivo`, `siguienteCodigo`, `generarCodigoConsulta`, `esFinal`), `TenantPrismaService`, `AuditLogService.log`, `esAdmin` de `src/common/auth/roles`.
- Produces (`EmpenosService`; `actor` es siempre `req.user`):
  - `crear(dto: CreateEmpenoDto, actor): Promise<EmpenoDetalle>`
  - `listar(filtros: FiltrosEmpenoDto, actor): Promise<EmpenoResumenItem[]>`
  - `obtener(id: number, actor, opts?: { incluirEliminados?: boolean }): Promise<EmpenoDetalle>` — 404 si no existe, si está eliminado (salvo admin con `incluirEliminados`) o si no es visible para el actor.
  - `cargarParaOperar(id: number, actor, tx?): Promise<EmpenoConPagos>` — usado por Task 6: mismo filtro de visibilidad y sin eliminados.
  - `actualizar(id: number, dto: UpdateEmpenoDto, actor): Promise<EmpenoDetalle>`
  - `eliminar(id: number, actor): Promise<void>`
  - `registrarMovimiento(tx, empenoId: number, tipo, usuarioId: number, detalle: string): Promise<void>`
  - `whereVisible(actor, opts?: { incluirEliminados?: boolean }): Prisma.EmpenoWhereInput` — `{ deletedAt: null }` más `usuarioId` si no es admin; lo usan todas las lecturas de las Tasks 5–7.
  - `EmpenoDetalle` = empeño + `articulo` + `cliente { id, nombres, apellidos, identificacion }` + `pagos` (no eliminados) + `movimientos` + `estado` (efectivo) + `liquidacion: Liquidacion` (a hoy).

**DTOs (class-validator):**
- `CreateEmpenoDto`: `clienteId` int+; `tipoArticulo` `IsIn(['VEHICULO','GENERAL'])`; `montoPrestado` number > 0; `tasa` number 1–100; `tipoPlazo` `IsIn(['DIA','SEMANA','MES'])`, opcional, default MES; `periodosMinimos` int ≥ 1; `periodosMaximos` int ≥ `periodosMinimos` (validar en el servicio → 400); `fechaIngreso` ISO opcional (default ahora; no futura); `notas` opcional ≤ 500; `articulo: ArticuloEmpenoDto` (`ValidateNested`, `Type`).
- `ArticuloEmpenoDto`: `descripcion` requerido ≤ 300, `categoria`, `estadoFisico`, `ubicacion` opcionales ≤ 100, `valorAvaluo` opcional ≥ 0; vehículo: `placa` (`/^[A-Z0-9-]{4,10}$/i`, se guarda en mayúsculas), `marca`, `modelo`, `anio` (1950…año actual + 1), `color`, `numeroChasis`, `numeroMotor`, `kilometraje` ≥ 0. Si `tipoArticulo = VEHICULO`, el servicio exige `placa`, `marca`, `modelo` y `anio` → 400.
- `UpdateEmpenoDto`: `notas`, `articulo` (parcial), y los financieros (`montoPrestado`, `tasa`, `tipoPlazo`, `periodosMinimos`, `periodosMaximos`) **solo si el empeño no tiene pagos activos** → si los tiene, 409 `No se pueden cambiar las condiciones de un empeño con pagos registrados`. Empeño con estado final → 409.
- `FiltrosEmpenoDto` (query, `Type(() => Number)` donde aplique): `estado`, `clienteId`, `q` (código, placa o descripción, contains insensitive), `vencenEnDias` (int 1–90), `incluirEliminados` (`'true'`).

**Reglas:**
- Visibilidad: `where.usuarioId = actor.id` salvo `esAdmin(actor)`. `incluirEliminados` lo ignora quien no sea admin.
- Filtro `estado=VENCIDO` ⇒ `estado IN (ACTIVO, VENCIDO) AND fechaMaxima < now`; `estado=ACTIVO` ⇒ `estado IN (ACTIVO, VENCIDO) AND fechaMaxima >= now`; `vencenEnDias=N` ⇒ activos con `fechaMaxima` entre ahora y ahora+N días.
- `crear`: verificar que el cliente existe y está activo (404). En una `$transaction`: `codigo = siguienteCodigo(último)`, `fechaMinima`/`fechaMaxima` con `sumarPeriodos`, `saldoCapital = montoPrestado`, crear artículo, movimiento `ENTRADA`. Fuera de la transacción: auditoría `EMPENO_CREAR`.
- Al leer: si `estadoEfectivo ≠ estado guardado` y no es final, persistir el nuevo estado y registrar movimiento `CAMBIO_ESTADO` (sin auditoría).
- `actualizar`: movimiento `EDICION` con los campos cambiados en `detalle`; auditoría `EMPENO_ACTUALIZAR`.
- `eliminar`: `deletedAt = now`, `deletedById = actor.id`, movimiento `ELIMINACION`, auditoría `EMPENO_ELIMINAR`. Ya eliminado → 404.

- [ ] **Step 1: Escribir las pruebas que fallan** con un fake de `TenantPrismaService` (objeto con `jest.fn()` para `client.empeno.findFirst/findMany/create/update`, `client.cliente.findFirst`, `$transaction: (fn) => fn(fake)`) y `AuditLogService` mockeado:

```ts
it('cobrador solo lista los suyos', async () => { await svc.listar({}, cobrador); expect(prisma.client.empeno.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ usuarioId: cobrador.id, deletedAt: null }) })); });
it('admin lista todos', async () => { await svc.listar({}, admin); const w = prisma.client.empeno.findMany.mock.calls[0][0].where; expect(w.usuarioId).toBeUndefined(); });
it('cobrador no ve empeño ajeno → 404', async () => { prisma.client.empeno.findFirst.mockResolvedValue(null); await expect(svc.obtener(7, cobrador)).rejects.toBeInstanceOf(NotFoundException); expect(prisma.client.empeno.findFirst.mock.calls[0][0].where).toMatchObject({ id: 7, usuarioId: cobrador.id }); });
it('vehículo sin placa → 400', async () => { await expect(svc.crear({ ...dtoVehiculo, articulo: { descripcion: 'Mazda' } }, admin)).rejects.toBeInstanceOf(BadRequestException); });
it('periodosMaximos < periodosMinimos → 400', ...);
it('crear calcula fechas y registra ENTRADA', async () => { /* fechaIngreso 2026-01-01, MES, min 2, max 4 → fechaMinima 2026-03-01, fechaMaxima 2026-05-01; movimiento tipo ENTRADA; audit EMPENO_CREAR */ });
it('eliminar hace soft delete', async () => { await svc.eliminar(1, admin); expect(prisma.client.empeno.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deletedById: admin.id, deletedAt: expect.any(Date) }) })); expect(prisma.client.empeno.delete).not.toHaveBeenCalled(); });
it('no cambia condiciones si hay pagos → 409', ...);
```
`admin = { id: 1, role: 'ADMIN', schemaName: 'tenant_x' }`, `cobrador = { id: 2, role: 'USER', schemaName: 'tenant_x' }`.

- [ ] **Step 2: Run** `npx jest src/modules/empenos/application/empenos.service` → FAIL.
- [ ] **Step 3: Implementar** DTOs y `EmpenosService` según las reglas.
- [ ] **Step 4: Run** el mismo comando → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): servicio de empeños con visibilidad y soft delete"`

---

### Task 6: Pagos, refrendos, cancelación, salida y liquidación

**Files:**
- Create: `src/modules/empenos/application/dto/create-pago-empeno.dto.ts`, `update-pago-empeno.dto.ts`, `salida-empeno.dto.ts`
- Create: `src/modules/empenos/application/empeno-pagos.service.ts`, `empeno-pagos.service.spec.ts`

**Interfaces:**
- Consumes: `EmpenosService.cargarParaOperar`, `registrarMovimiento` (Task 5); `reconstruirEstado`, `liquidar`, `ErrorLiquidacion` (Task 2); `estadoEfectivo`, `puedeRegistrarSalida`, `esFinal` (Task 3).
- Produces (`EmpenoPagosService`):
  - `liquidacion(id: number, actor, fecha?: Date): Promise<Liquidacion>`
  - `registrarPago(id: number, dto: CreatePagoEmpenoDto, actor): Promise<EmpenoDetalle>`
  - `editarPago(id: number, pagoId: number, dto: UpdatePagoEmpenoDto, actor): Promise<EmpenoDetalle>`
  - `eliminarPago(id: number, pagoId: number, actor): Promise<EmpenoDetalle>`
  - `registrarSalida(id: number, dto: SalidaEmpenoDto, actor): Promise<EmpenoDetalle>`

**DTOs:** `CreatePagoEmpenoDto { tipo: 'INTERES'|'ABONO_CAPITAL'|'CANCELACION'; monto: number > 0; periodosCubiertos?: int ≥ 1 (requerido si INTERES); fecha?: ISO (default ahora, no futura) }`. `UpdatePagoEmpenoDto` = `PartialType` sin `tipo`. `SalidaEmpenoDto { tipo: 'VENDIDO'|'ADJUDICADO'; montoSalida?: number ≥ 0; motivo: string ≤ 300 }`.

**Regla central — `aplicar(empeno, pagosNuevos, tx)`** (privada, la usan registrar, editar y eliminar): reconstruye con `reconstruirEstado(datos, pagosNuevos)`. Si lanza `ErrorLiquidacion` ⇒ `BadRequestException(err.message)` y la transacción no escribe nada. Si va bien, en la misma `$transaction`:
- escribe el desglose de cada pago (`interesAbonado`, `capitalAbonado`, `saldoCapitalDespues`);
- actualiza en `Empeno`: `saldoCapital`, `periodosPagados`, `fechaMaxima`; `estado = cancelado ? 'RECUPERADO' : estadoEfectivo(...)`; si `cancelado`, `fechaSalida = fecha del pago de cancelación`, `motivoSalida = 'Rescate por el cliente'`, `montoSalida = monto`.

**Reglas:**
- Registrar pago en un empeño final o con salida → 409.
- Movimientos: INTERES → `REFRENDO` (y auditoría `EMPENO_REFRENDO`); ABONO_CAPITAL → `ABONO`; CANCELACION → `SALIDA` (y auditoría `EMPENO_SALIDA`). Además, `PAGO_EMPENO_CREAR` siempre.
- `editarPago` / `eliminarPago`: solo si el empeño **no** tiene salida por VENDIDO/ADJUDICADO; eliminar = soft delete del pago (`deletedAt`, `deletedById`) y replay sin él. Si el pago eliminado era la cancelación, el empeño vuelve a su estado efectivo y se limpian `fechaSalida`, `motivoSalida` y `montoSalida`. Movimiento `EDICION`; auditoría `PAGO_EMPENO_ACTUALIZAR` / `PAGO_EMPENO_ELIMINAR`.
- `registrarSalida`: exige `puedeRegistrarSalida(estadoEfectivo(...))` → si no, 409 `Solo se puede registrar la salida de un empeño vencido`. Pone `estado = dto.tipo`, `fechaSalida = now`, `motivoSalida`, `montoSalida`; movimiento `SALIDA`; auditoría `EMPENO_SALIDA`.

- [ ] **Step 1: Escribir las pruebas que fallan** (mismo fake de prisma que la Task 5; datos base de la Task 2):

```ts
it('refrendo actualiza fechaMaxima y registra REFRENDO', ...);            // 2026-05-01 → 2026-06-01
it('cancelación correcta deja RECUPERADO con salida', ...);               // monto 1_100_000 el 2026-02-10
it('cancelación con monto incorrecto → 400 y no escribe', async () => { await expect(svc.registrarPago(1, { tipo: 'CANCELACION', monto: 5 }, admin)).rejects.toBeInstanceOf(BadRequestException); expect(prisma.client.empeno.update).not.toHaveBeenCalled(); });
it('eliminar un abono intermedio que invalida un refrendo posterior → 400', ...);
it('pago sobre empeño RECUPERADO → 409', ...);
it('salida de empeño ACTIVO → 409', ...);
it('cobrador no puede pagar empeño ajeno → 404', ...);                     // cargarParaOperar devuelve NotFoundException
it('eliminar la cancelación reabre el empeño', ...);                       // estado vuelve a ACTIVO/VENCIDO, fechaSalida null
```

- [ ] **Step 2: Run** `npx jest src/modules/empenos/application/empeno-pagos` → FAIL.
- [ ] **Step 3: Implementar** DTOs y servicio.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): pagos, refrendos, rescate y salida"`

---

### Task 7: Reportes (resumen, por cliente, movimientos)

**Files:**
- Create: `src/modules/empenos/application/empeno-reportes.service.ts`, `empeno-reportes.service.spec.ts`

**Interfaces:**
- Consumes: `EmpenosService.whereVisible` (Task 5), `liquidar`, `reconstruirEstado`.
- Produces (`EmpenoReportesService`):
  - `resumen(actor): Promise<{ activos: number; vencidos: number; porVencer7Dias: number; capitalPrestado: number; interesPorCobrar: number; recuperadosMes: number; vendidosMes: number }>` — solo empeños visibles y no eliminados; `capitalPrestado` = suma de `saldoCapital` de activos y vencidos; `interesPorCobrar` = suma de `liquidar(...).interesAdeudado` a hoy; "Mes" = mes calendario actual.
  - `porCliente(clienteId: number, actor): Promise<{ cliente; empenos: EmpenoResumenItem[]; totales: { activos: number; saldoCapital: number; interesAdeudado: number; totalParaRescatar: number } }>`
  - `movimientos(filtros: { desde: Date; hasta: Date; tipo?: TipoMovimientoEmpeno }, actor): Promise<Array<{ fecha; tipo; detalle; empeno: { id; codigo }; cliente: { nombres; apellidos }; usuario: { nombre } }>>` — rango máximo 366 días → 400.

- [ ] **Step 1: Pruebas que fallan:** cobrador ⇒ los `where` incluyen `usuarioId`; `interesPorCobrar` suma las liquidaciones de 2 empeños de ejemplo (100.000 + 40.000 = 140.000); rango de 400 días → 400.
- [ ] **Step 2: Run** `npx jest src/modules/empenos/application/empeno-reportes` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): resumen, vista por cliente y reporte de movimientos"`

---

### Task 8: Portal del cliente (consulta pública con límite de intentos)

**Files:**
- Create: `src/modules/empenos/application/dto/consulta-portal.dto.ts`
- Create: `src/modules/empenos/application/empeno-portal.service.ts`, `empeno-portal.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (esquema principal, para validar la empresa), `TenantPrismaService.forSchema(schema)`, `liquidar`, `reconstruirEstado`, `estadoEfectivo`.
- Produces: `EmpenoPortalService.consultar(dto: ConsultaPortalDto, ip: string): Promise<PortalRespuesta>`.
  - `ConsultaPortalDto { schemaName: string (/^[a-z][a-z0-9_]{0,62}$/); identificacion: string ≤ 30; codigoConsulta: string (/^[A-Z0-9]{6}$/i, se compara en mayúsculas) }`. *(`schemaName` no aparece en el spec, pero es necesario porque el endpoint es público y no hay JWT del que sacar la empresa. La app ya lo tiene guardado.)*
  - `PortalRespuesta = { cliente: { nombres; apellidos }; empenos: Array<{ codigo; tipoArticulo; articulo: { descripcion; placa?; marca?; modelo? }; fechaIngreso; fechaMinima; fechaMaxima; estado; montoPrestado; saldoCapital; interesAdeudado; totalParaRescatar }> }` — **sin** `codigoConsulta`, ids internos, usuario ni notas.

**Reglas:**
- La empresa debe existir en `Tenant` (esquema principal) y no ser `MAIN_SCHEMA`; si no, 404 genérico.
- Busca el cliente activo por `identificacion`; exige que **alguno** de sus empeños no eliminados tenga ese `codigoConsulta`; si no, 404 genérico `No se encontró información con esos datos` (mismo mensaje en todos los casos de no encontrado).
- Devuelve todos los empeños no eliminados de ese cliente.
- Límite: un `Map<string, number[]>` en memoria con los timestamps de fallos por IP; con 10 fallos en 15 minutos responde `HttpException('Demasiados intentos, intenta más tarde', 429)` **antes** de consultar. Un acierto no borra el historial.

- [ ] **Step 1: Pruebas que fallan:** código correcto devuelve los empeños sin `codigoConsulta`; código de otro cliente → 404; empresa inexistente → 404; tras 10 fallos desde la misma IP → 429 aunque el 11.º sea correcto; otra IP no se ve afectada.
- [ ] **Step 2: Run** `npx jest src/modules/empenos/application/empeno-portal` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): portal de consulta para el cliente"`

---

### Task 9: Controladores, módulo y registro en la app

**Files:**
- Create: `src/modules/empenos/presentation/empenos.controller.ts`, `empenos-portal.controller.ts`
- Create: `src/modules/empenos/empenos.module.ts`
- Modify: `src/app.module.ts` (añadir `EmpenosModule` a `imports`)

**Interfaces:**
- Consumes: servicios de las Tasks 5–8, `JwtAuthGuard`, `RolesGuard`, `Roles`, `AdminWebGuard`, `Public`.
- Produces: las rutas del spec §7, exactamente:

| Método y ruta | Guards / decoradores | Servicio |
|---|---|---|
| `GET /empenos` | Jwt + Roles | `listar(query, req.user)` |
| `GET /empenos/resumen` | Jwt | `resumen` |
| `GET /empenos/movimientos` | Jwt | `movimientos` |
| `GET /empenos/cliente/:clienteId` | Jwt | `porCliente` |
| `GET /empenos/:id` | Jwt | `obtener` (`incluirEliminados` del query, solo admin) |
| `GET /empenos/:id/liquidacion?fecha=` | Jwt | `liquidacion` |
| `POST /empenos` | Jwt | `crear` |
| `PUT /empenos/:id` | Jwt + `@Roles('admin')` | `actualizar` |
| `POST /empenos/:id/pagos` | Jwt | `registrarPago` |
| `PUT /empenos/:id/pagos/:pagoId` | Jwt + `@Roles('admin')` | `editarPago` |
| `POST /empenos/:id/salida` | Jwt | `registrarSalida` |
| `DELETE /empenos/:id` | Jwt + `@Roles('admin')` + `AdminWebGuard` | `eliminar` |
| `DELETE /empenos/:id/pagos/:pagoId` | Jwt + `@Roles('admin')` + `AdminWebGuard` | `eliminarPago` |
| `POST /empenos/portal/consulta` | `@Public()` (controlador aparte, sin `JwtAuthGuard`) | `consultar(dto, req.ip)` |

Las rutas literales (`resumen`, `movimientos`, `cliente/:clienteId`) se declaran **antes** de `:id`. Todos los `:id` usan `ParseIntPipe`. Swagger: `@ApiTags('empenos')`, `@ApiBearerAuth()`.

`EmpenosModule`: `imports: [AuditLogModule, PrismaModule]`; providers: los 4 servicios + `AdminWebGuard`.

- [ ] **Step 1: Implementar** controladores y módulo, y registrarlo en `app.module.ts`.
- [ ] **Step 2: Compilar y probar todo**

Run: `npm run build && npm test`
Expected: build sin errores; todas las suites PASS (las existentes y las nuevas).

- [ ] **Step 3: Verificar que no cambió nada existente**

Run: `git diff fix/seguridad-roles --stat -- src ':!src/modules/empenos' ':!src/common/auth/admin-web.guard*'`
Expected: solo `src/app.module.ts` y `src/common/audit/audit-log.service.ts`, con líneas añadidas (ninguna eliminada).

- [ ] **Step 4: Prueba manual contra una base LOCAL** (Docker `postgres:15`, nunca la del `.env`): `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/empenos_test?schema=master npx prisma migrate deploy`, crear una empresa con `POST /tenants` (plan gratuito), iniciar sesión y, desde Swagger (`/api`), recorrer: crear empeño de vehículo → liquidación → refrendo → abono → cancelación; un cobrador no ve el de otro; `DELETE` sin `X-Client` → 403 y con él → 200; portal con código correcto e incorrecto.
Expected: cada paso responde según el spec.

- [ ] **Step 5: Commit** `git commit -m "feat(empenos): endpoints REST y registro del módulo"`

---

## Despliegue (para el usuario, no para el implementador)

1. Desplegar el backend (aplica la migración al esquema principal vía `entrypoint.sh`).
2. Ejecutar `npm run migrate:tenants` en el servidor para crear las tablas en las empresas ya existentes.
3. Después, desplegar el panel (plan 2/3) y la app (plan 3/3).
