# Módulo de Empeños — Diseño

**Fecha:** 2026-10-15
**Proyectos afectados:** `prestamos-bk` (NestJS + Prisma, multi-tenant por esquema), `PrestamosAdmin` (Angular), `Prestamosfn` (Flutter)
**Rama base:** `fix/seguridad-roles` (necesita `RolesGuard`, `@Roles`, `@SuperAdmin`, `esAdmin()`)

---

## 1. Intención

Un cliente de la plataforma (una casa de empeño) recibe **autos y otros artículos** como garantía de un préstamo. Necesita llevar el control de **qué entra y qué sale**: cuándo llega cada artículo, cuánto tiempo lleva, su fecha mínima y máxima, los intereses que genera y, sobre todo, **ver todo agrupado por cliente** (quién tiene qué empeñado y cuánto debe).

Debe sentirse parte del sistema actual: mismos clientes, mismas tasas por periodo que los préstamos, misma auditoría, mismo esquema por empresa.

## 2. Objetivos

1. Registrar empeños de **autos** (ficha vehicular) y de **artículos generales**.
2. Calcular intereses **en el backend** (fuente única de verdad) con tasa % por periodo, igual que los préstamos.
3. Registrar **pagos**: intereses (refrendo), abonos a capital y cancelación total (rescate).
4. Controlar **entradas y salidas** del artículo con fecha, motivo y usuario.
5. Vistas por cliente: artículos empeñados, tiempo transcurrido, fechas, interés acumulado y saldo.
6. Alertas: empeños próximos a vencer y vencidos.
7. Permisos repartidos entre panel admin, app y cliente final (ver §6).
8. Eliminación siempre **lógica** (soft delete) y auditada.

## 3. No-objetivos (v1)

- Fotos o documentos adjuntos del artículo (se puede agregar después).
- Venta automática del artículo vencido o integración con el módulo de mercancía (en v1 solo se marca la salida como *vendido* o *adjudicado*, con el monto, y se registra el ingreso).
- Contratos o boletas en PDF (pendiente como mejora).
- Pasarela de pago para el cliente final.
- Cambios al cálculo de los préstamos existentes.
- Integrar empeños en los reportes contables existentes (estado de resultados, cartera). En v1 los empeños tienen su propio resumen (`/empenos/resumen`) y reporte de movimientos.

## 4. Anti-objetivos (sería un fracaso aunque "funcione")

- **Romper o alterar** préstamos, pagos, rutas, mercancía, reportes o las pantallas existentes. Todo es aditivo: tablas, endpoints, rutas y pantallas nuevas. Cualquier cambio en código existente se limita a registrar el módulo, añadir entradas de menú y añadir acciones de auditoría.
- Que la app pueda eliminar algo, aunque sea escondiendo botones: **el backend debe rechazarlo**.
- Borrado físico de cualquier registro de empeño.
- Calcular intereses en el frontend con reglas distintas a las del backend.
- Que un cliente final pueda ver empeños de otra persona con solo conocer su número de cédula.

## 5. Modelo de datos (Prisma, esquema de cada tenant)

Una migración nueva con tablas y enums nuevos. **No se modifican modelos existentes**, salvo agregar las relaciones inversas (`Cliente.empenos`, `User.empenos...`), que no cambian columnas.

### `Empeno`
| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| codigo | String @unique | `EMP-000123`, generado en backend |
| clienteId | Int → Cliente | cliente existente del sistema |
| usuarioId | Int → User | quien lo registró (**del JWT**, nunca del body) |
| tipoArticulo | enum `VEHICULO \| GENERAL` | |
| montoPrestado | Decimal(12,2) | capital inicial |
| tasa | Float | % por periodo, 1–100 (igual que préstamos) |
| tipoPlazo | enum existente `TipoPlazo` (DIA, SEMANA, MES) | por defecto MES |
| periodosMinimos | Int ≥ 1 | define la fecha mínima |
| periodosMaximos | Int ≥ periodosMinimos | define la fecha máxima inicial |
| fechaIngreso | Timestamp | cuándo entró el artículo |
| fechaMinima | Timestamp | calculada: ingreso + periodosMinimos |
| fechaMaxima | Timestamp | calculada; se corre con cada refrendo |
| saldoCapital | Decimal(12,2) | baja con abonos a capital |
| estado | enum `EmpenoEstado`: `ACTIVO, RECUPERADO, VENCIDO, VENDIDO, ADJUDICADO` | |
| fechaSalida | Timestamp? | cuando sale el artículo |
| motivoSalida | String? | |
| montoSalida | Decimal? | lo cobrado en rescate o venta |
| codigoConsulta | String | 6 caracteres aleatorios (crypto) para el portal del cliente (§6.3) |
| notas | String? | |
| deletedAt / deletedById | DateTime? / Int? | soft delete |
| createdAt / updatedAt | | |

### `ArticuloEmpeno` (1 a 1 con `Empeno`)
- Comunes: `descripcion`, `categoria` (String libre: joyería, electrónico, herramienta…), `estadoFisico`, `valorAvaluo` (Decimal), `ubicacion` (dónde se guarda físicamente).
- Vehículo (nullable, obligatorios si `tipoArticulo = VEHICULO`): `placa`, `marca`, `modelo`, `anio`, `color`, `numeroChasis`/VIN, `numeroMotor`, `kilometraje`.
- Índice en `placa`, para buscar por placa.

### `PagoEmpeno`
| Campo | Notas |
|---|---|
| empenoId, usuarioId (del JWT), fecha | |
| tipo | enum `INTERES` (refrendo), `ABONO_CAPITAL`, `CANCELACION` |
| monto, interesAbonado, capitalAbonado, saldoCapitalDespues | desglose calculado por el backend |
| periodosCubiertos | Int, para refrendos |
| deletedAt / deletedById | soft delete |

### `MovimientoEmpeno` (bitácora de entradas y salidas)
`empenoId`, `tipo` (`ENTRADA`, `REFRENDO`, `ABONO`, `SALIDA`, `CAMBIO_ESTADO`, `EDICION`), `fecha`, `usuarioId`, `detalle`. Es la línea de tiempo que se muestra en el detalle y la base del reporte de "qué entró y qué salió".

## 6. Reglas de negocio

### 6.1 Intereses (backend, función pura con pruebas unitarias)
- Periodo en días: DIA = 1, SEMANA = 7, MES = **calendario** (mismo día del mes siguiente).
- **Interés por periodo iniciado sobre el saldo de capital:** `interésPeriodo = saldoCapital × tasa / 100`.
- Interés adeudado a una fecha = periodos iniciados desde el último periodo pagado × interés del periodo (con el saldo vigente en cada periodo).
- **Mínimo cobrable:** si se cancela antes de `fechaMinima`, se cobran igual los `periodosMinimos`.
- **Refrendo:** pagar el interés de N periodos corre `fechaMaxima` N periodos. El artículo sigue `ACTIVO`.
- **Abono a capital:** primero cubre el interés vencido y el resto reduce `saldoCapital`.
- **Cancelación (rescate):** se exige `saldoCapital + interés adeudado`; el estado pasa a `RECUPERADO` y se registra la salida.
- Montos redondeados a 2 decimales, sin decimales de más en moneda COP (mismo formateo que la app).

### 6.2 Estados y salidas
```
ACTIVO ──cancelación──▶ RECUPERADO (sale; final)
ACTIVO ──fechaMaxima pasada──▶ VENCIDO
VENCIDO ──refrendo──▶ ACTIVO   (permitido mientras no haya salida)
VENCIDO ──salida──▶ VENDIDO | ADJUDICADO (sale; final)
```
- `VENCIDO` se calcula al consultar (si `ACTIVO` y `ahora > fechaMaxima`) y además se persiste de forma diferida en cada lectura o escritura del empeño. No requiere cron.
- Un empeño con salida registrada no admite pagos ni ediciones de montos.

### 6.3 Permisos (aplicados en el backend con `RolesGuard`)
| Acción | Panel admin (rol admin) | App: admin | App: cobrador/usuario | Cliente final |
|---|---|---|---|---|
| Listar / ver detalle | ✅ todos | ✅ todos | ✅ **solo los que registró** | ✅ solo los suyos (portal) |
| Registrar empeño | ✅ | ✅ | ✅ | ❌ |
| Registrar pago / refrendo / salida | ✅ | ✅ | ✅ | ❌ |
| Editar empeño, artículo o pago | ✅ | ✅ | ❌ | ❌ |
| Eliminar (soft delete) | ✅ | ❌ | ❌ | ❌ |
| Ver eliminados (auditoría) | ✅ | ❌ | ❌ | ❌ |

- **Visibilidad:** igual que préstamos hoy. El admin ve todos los empeños de la empresa; el cobrador o usuario solo ve los que él registró (`usuarioId` = el suyo). El filtro se aplica en el backend en **todas** las lecturas (lista, detalle, por cliente, resumen, movimientos, liquidación) y también en las escrituras: un cobrador no puede pagar ni sacar un empeño ajeno (404). *(Decidido por el usuario.)*
- **El panel y la app usan la misma API.** Para diferenciarlos, el endpoint `DELETE` exige rol admin **y** la cabecera `X-Client: admin-web`, que solo envía el interceptor del panel. La app nunca la envía y no tiene botón de eliminar. *(Esta cabecera es una barrera de producto, no de seguridad: la seguridad real es el rol admin. Ver la pregunta en §10.)*
- **Soft delete:** se marcan `deletedAt` y `deletedById`, se registra `EMPENO_ELIMINAR` en `AuditLog` y desaparece de los listados normales. El panel tiene el filtro "Mostrar eliminados" (solo lectura).
- **Portal del cliente final:** consulta con `identificación + codigoConsulta` del empeño (impreso o enviado al cliente al registrar). Devuelve solo los empeños de ese cliente que coincidan. Endpoint `@Public()` con límite de intentos por IP. Nunca expone otros clientes.

### 6.4 Auditoría
Acciones nuevas en `AuditAction`: `EMPENO_CREAR`, `EMPENO_ACTUALIZAR`, `EMPENO_ELIMINAR`, `EMPENO_SALIDA`, `EMPENO_REFRENDO`, `PAGO_EMPENO_CREAR`, `PAGO_EMPENO_ACTUALIZAR`, `PAGO_EMPENO_ELIMINAR`. Además, cada acción genera un `MovimientoEmpeno`.

### 6.5 Plan y suscripción
- Escrituras bloqueadas si el plan venció (interceptor existente, sin cambios).
- **No** se añaden límites por plan en v1.

## 7. API (`/empenos`, módulo nuevo `EmpenosModule`)

| Método | Ruta | Rol |
|---|---|---|
| GET | `/empenos?estado=&clienteId=&q=&vencenEnDias=&incluirEliminados=` | autenticado (`incluirEliminados` solo admin) |
| GET | `/empenos/:id` | autenticado — incluye artículo, pagos, movimientos y **liquidación actual** |
| GET | `/empenos/:id/liquidacion?fecha=` | autenticado — interés adeudado, mínimo, total para rescatar |
| GET | `/empenos/cliente/:clienteId` | autenticado — resumen por cliente |
| GET | `/empenos/resumen` | autenticado — totales: activos, capital prestado, interés por cobrar, vencidos, por vencer (7 días) |
| GET | `/empenos/movimientos?desde=&hasta=&tipo=` | autenticado — reporte de entradas y salidas |
| POST | `/empenos` | autenticado |
| PUT | `/empenos/:id` | admin |
| POST | `/empenos/:id/pagos` | autenticado (tipo INTERES / ABONO_CAPITAL / CANCELACION) |
| PUT | `/empenos/:id/pagos/:pagoId` | admin — recalcula saldos |
| POST | `/empenos/:id/salida` | autenticado — VENDIDO / ADJUDICADO (solo si VENCIDO) |
| DELETE | `/empenos/:id` y `/empenos/:id/pagos/:pagoId` | admin + `X-Client: admin-web` — soft delete |
| POST | `/empenos/portal/consulta` | `@Public()` — `{ identificacion, codigoConsulta }` |

Validación con DTOs de `class-validator` (`whitelist` + `forbidNonWhitelisted`, ya globales). `usuarioId` siempre sale de `req.user`.

## 8. Interfaces

### 8.1 Panel admin (Angular)
- Menú lateral: nueva sección **Empeños** (lista, nuevo, detalle o edición), siguiendo el patrón de `prestamos-list` y `prestamo-form`.
- **Lista:** filtros por estado, cliente, búsqueda (código, placa, descripción), "vencen en 7 días" y "mostrar eliminados". Chips de estado con color.
- **Formulario:** selector de cliente existente, tipo de artículo (los campos de vehículo aparecen solo si es VEHICULO), monto, tasa, periodo, periodos mínimos y máximos, con **vista previa de fechas e intereses** calculada por el endpoint de liquidación.
- **Detalle:** datos, liquidación al día, pagos, línea de tiempo de movimientos y acciones (pagar, refrendar, rescatar, salida, editar, eliminar).
- **Por cliente:** en el detalle o lista de clientes, una pestaña o sección "Empeños".
- **Reportes:** tarjeta "Empeños" con el resumen y el reporte de entradas y salidas por rango de fechas.

### 8.2 App (Flutter)
- Nueva feature `lib/features/empenos/` (data / presentation), con la estructura de `prestamos`.
- Dashboard: acceso "Empeños" visible para todos los roles.
- Pantallas: lista con filtros, crear, detalle (liquidación, pagos, movimientos), registrar pago, refrendo y salida.
- Al crear el empeño, la app muestra el **código de consulta** del cliente con un botón para compartirlo (`share_plus`, ya instalado). El detalle también lo muestra. **Editar** solo si el rol es admin. **Sin eliminar.**
- Soporte offline: **no en v1**. Las escrituras de empeños requieren conexión, porque los montos y la liquidación dependen del backend. Se muestra el aviso "Requiere conexión".

### 8.3 Portal del cliente (app, "Ingresar como cliente")
- Tras la reorganización de esa pantalla (trabajo aparte, §11), una opción "Mis empeños" pide identificación y código de consulta, y muestra artículos, fechas, interés acumulado y total para rescatar, en solo lectura.

## 9. Pruebas
- **Unitarias** de la función de liquidación: fijo por periodos, mínimo, refrendo, abono a capital, rescate antes del mínimo, meses de distinta longitud y redondeo.
- **Servicio:** transiciones de estado, que no se pueda pagar un empeño con salida y que el soft delete oculte el registro y escriba auditoría.
- **Permisos:** cobrador no edita (403), app sin cabecera no elimina (403), cliente del portal no ve empeños ajenos.
- **Regresión:** compilar y verificar que los endpoints existentes no cambian (sin cambios en sus archivos más allá del registro del módulo).

## 10. Decisiones tomadas por mí (revisar)
1. Interés por periodo iniciado sobre el saldo de capital, con meses calendario.
2. Estado VENCIDO calculado al consultar, sin tarea programada.
3. Portal del cliente con identificación + código de consulta por empeño, en vez de usuario y contraseña de cliente.
4. Diferenciar panel y app con la cabecera `X-Client` además del rol.
5. Sin offline para empeños en v1.
6. Fotos, PDF de boleta y venta en el módulo de mercancía quedan para después.
7. `tasa` es % por periodo (como la usa la app hoy), no anual.
8. El código de consulta se comparte desde la app al crear el empeño.
9. Empeños fuera de los reportes contables actuales en v1.
10. El cliente se elige de los clientes existentes. Si no existe, se crea primero con el flujo actual de clientes.

## 11. Trabajo relacionado, por separado
- **Reorganizar la pantalla "Ingresar como usuario / cliente"** que aparece al cerrar sesión. Se hace **después** de este módulo, como tarea propia.

## 12. Orden de construcción sugerido
1. Backend: migración + función de liquidación con pruebas → servicio → controlador → permisos → auditoría.
2. Panel admin: lista → formulario → detalle → reportes.
3. App: lista → crear → detalle y pagos → editar (admin).
4. Portal del cliente (junto con la reorganización de la pantalla de acceso).
