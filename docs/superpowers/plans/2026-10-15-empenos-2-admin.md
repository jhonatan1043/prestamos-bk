# Empeños (2/3) — Panel Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a `PrestamosAdmin` la sección **Empeños** (lista, formulario, detalle con pagos y movimientos, reportes y empeños por cliente), con editar y eliminar (soft delete), consumiendo la API del plan 1/3.

**Architecture:** Componentes standalone de Angular 20 cargados con `loadComponent`, como el resto de `dashboard/pages`. Un servicio tipado `EmpenosApi` sobre el `Api` existente concentra los endpoints. El interceptor existente añade `X-Client: admin-web` a todas las peticiones del panel, que es lo que habilita el `DELETE`.

**Tech Stack:** Angular 20 (standalone), Reactive Forms, Angular Material (autocomplete, ya usado en `prestamo-form`), Karma + Jasmine (`ng test`).

**Spec:** `prestamos-bk/docs/superpowers/specs/2026-10-15-empenos-design.md` (§6.3, §8.1). **Depende de:** plan 1/3 desplegado o corriendo en local.

## Global Constraints

- Repo: `C:\Users\PoseidonDev\Documents\IATech\PrestamosAdmin\PrestamosAdmin`, rama nueva `feature/empenos` desde `master`. **Antes de empezar**, el usuario tiene cambios sin commitear en `token-interceptor.ts`, `dashboard-module.ts`, `pages-module.ts` y en las páginas de ventas: pedirle que los commitee o los guarde. No pisarlos.
- Solo aditivo. Archivos existentes que se pueden tocar: `src/app/auth/token-interceptor.ts` (cabecera), `src/app/dashboard/dashboard-module.ts` (rutas), `src/app/dashboard/sidebar/sidebar.html` (menú), `src/app/dashboard/pages/clientes-list/*` (botón "Empeños" por cliente) y `src/app/dashboard/pages/reportes-list/*` (tarjeta).
- Todos los cálculos de dinero vienen del backend (`liquidacion`); el panel **no** calcula intereses.
- Montos con el pipe existente `CurrencyFormatPipe`. Fechas `dd/MM/yyyy`.
- Eliminar siempre pide confirmación con el texto: `¿Eliminar el empeño {codigo}? Quedará guardado para auditoría y dejará de aparecer en las listas.`
- Botones de editar y eliminar visibles solo si el rol es admin (`ADMIN`/`ADMINISTRADOR`, leído del `user` en `localStorage`, como hace `header.ts`). El backend igualmente lo valida.

## Review Focus

1. **Vehículo ↔ general:** al cambiar el tipo en el formulario, los campos de vehículo aparecen o desaparecen y sus validadores se activan o se limpian (no se envían campos vacíos de vehículo en un GENERAL). *(Test en Task 3.)*
2. **Error 400 del backend en un pago** (monto que no cuadra) → se muestra el `message` del backend junto al formulario, sin cerrar el diálogo. *(Test en Task 4.)*
3. **Empeño con pagos:** el formulario de edición deshabilita monto, tasa, periodo y periodos. *(Test en Task 3.)*
4. **"Mostrar eliminados"** → filas en gris, sin acciones de escritura. *(Test en Task 2.)*
5. **Token vencido a mitad de un formulario** → el interceptor existente redirige; no se pierde la cabecera `X-Client` en el reintento. *(Test en Task 1.)*

---

## File Structure

```
src/app/auth/token-interceptor.ts                         (modify) + X-Client: admin-web
src/app/dashboard/pages/empenos/
  empenos.models.ts                                       tipos de la API
  empenos-api.ts (+ .spec.ts)                             servicio tipado
  empenos-list/empenos-list.{ts,html,scss} (+ .spec.ts)   lista + filtros + resumen
  empeno-form/empeno-form.{ts,html,scss} (+ .spec.ts)     crear / editar
  empeno-detalle/empeno-detalle.{ts,html,scss} (+ .spec.ts) detalle, liquidación, pagos, movimientos, acciones
  empeno-pago-dialog/empeno-pago-dialog.{ts,html} (+ .spec.ts) registrar / editar pago
  empenos-movimientos/empenos-movimientos.{ts,html,scss}  reporte de entradas y salidas
src/app/dashboard/dashboard-module.ts                     (modify) rutas
src/app/dashboard/sidebar/sidebar.html                    (modify) sección "Empeños"
```

---

### Task 1: Cabecera del panel, modelos y servicio de API

**Files:**
- Modify: `src/app/auth/token-interceptor.ts`
- Create: `src/app/dashboard/pages/empenos/empenos.models.ts`, `empenos-api.ts`, `empenos-api.spec.ts`
- Create or modify: `src/app/auth/token-interceptor.spec.ts`

**Interfaces:**
- Produces:
  - Tipos en `empenos.models.ts` que reflejan exactamente las respuestas del plan 1/3: `EmpenoEstado`, `TipoArticulo`, `TipoPlazo`, `TipoPagoEmpeno`, `ArticuloEmpeno`, `PagoEmpeno`, `MovimientoEmpeno`, `Liquidacion`, `EmpenoResumenItem`, `EmpenoDetalle`, `ResumenEmpenos`, `EmpenosPorCliente`, `FiltrosEmpenos`, `CrearEmpeno`, `ActualizarEmpeno`, `CrearPagoEmpeno`, `SalidaEmpeno`.
  - `EmpenosApi` (`providedIn: 'root'`): `listar(f: FiltrosEmpenos)`, `obtener(id, incluirEliminados?)`, `liquidacion(id, fecha?)`, `resumen()`, `porCliente(clienteId)`, `movimientos(desde: string, hasta: string, tipo?)`, `crear(dto)`, `actualizar(id, dto)`, `registrarPago(id, dto)`, `editarPago(id, pagoId, dto)`, `eliminarPago(id, pagoId)`, `registrarSalida(id, dto)`, `eliminar(id)`. Todos devuelven `Observable<...>` usando `Api`. Los filtros vacíos no se envían como query.

- [ ] **Step 1: Pruebas que fallan**
  - `token-interceptor.spec.ts`: toda petición sale con `X-Client: admin-web`, con o sin token.
  - `empenos-api.spec.ts` (`HttpTestingController`): `listar({ estado: 'VENCIDO', q: '' })` llama `GET {apiUrl}/empenos?estado=VENCIDO` (sin `q`); `eliminar(5)` llama `DELETE {apiUrl}/empenos/5`; `registrarPago(5, {...})` hace `POST {apiUrl}/empenos/5/pagos` con el body exacto.
- [ ] **Step 2: Run** `npx ng test --watch=false --include='src/app/**/{token-interceptor,empenos-api}.spec.ts'` → FAIL.
- [ ] **Step 3: Implementar.** En el interceptor, añadir `'X-Client': 'admin-web'` dentro del mismo `setHeaders` (siempre, no solo cuando hay token).
- [ ] **Step 4: Run** el mismo comando → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): cabecera del panel y servicio de API"`

---

### Task 2: Lista de empeños con filtros y resumen

**Files:**
- Create: `src/app/dashboard/pages/empenos/empenos-list/*` (+ `.spec.ts`)
- Modify: `src/app/dashboard/dashboard-module.ts` (ruta `empenos`), `src/app/dashboard/sidebar/sidebar.html`

**Interfaces:**
- Consumes: `EmpenosApi.listar`, `resumen`, `eliminar`.
- Produces: componente `EmpenosList` en la ruta `/dashboard/empenos`. Acepta el query param `clienteId` (lo usa la Task 5).

**Comportamiento:**
- Tarjetas arriba con `resumen()`: Activos, Vencidos, Por vencer (7 días), Capital prestado, Interés por cobrar.
- Filtros: estado (Todos / Activo / Vencido / Recuperado / Vendido / Adjudicado), búsqueda `q` (código, placa o descripción; debounce de 300 ms), "Vencen en 7 días" y "Mostrar eliminados".
- Columnas: Código, Cliente, Artículo (placa · marca modelo, o descripción), Prestado, Saldo, Fecha máxima, Estado (chip: ACTIVO verde, VENCIDO rojo, RECUPERADO azul, VENDIDO/ADJUDICADO gris), Acciones (Ver; Editar y Eliminar si es admin y la fila no está eliminada).
- Botón "Nuevo empeño" → `/dashboard/empenos/nuevo`.
- Sidebar: sección nueva **Empeños**, después de "Mercancía", con los enlaces "Empeños" (icono `diamond`) y "Entradas y salidas" (icono `swap_horiz`, ruta de la Task 5).

- [ ] **Step 1: Pruebas que fallan:** con datos simulados, renderiza el chip `VENCIDO` en rojo; un usuario no admin no ve botones de eliminar; con "Mostrar eliminados" la fila eliminada tiene la clase `fila-eliminada` y ningún botón de escritura; eliminar pide `confirm` y, al aceptar, llama `eliminar(id)` y recarga.
- [ ] **Step 2: Run** `npx ng test --watch=false --include='**/empenos-list.spec.ts'` → FAIL.
- [ ] **Step 3: Implementar** componente, ruta y menú.
- [ ] **Step 4: Run** → PASS, y `npx ng build` sin errores.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): lista con filtros y resumen"`

---

### Task 3: Formulario de crear y editar

**Files:**
- Create: `src/app/dashboard/pages/empenos/empeno-form/*` (+ `.spec.ts`)
- Modify: `src/app/dashboard/dashboard-module.ts` (rutas `empenos/nuevo` y `empenos/:id/editar`)

**Interfaces:**
- Consumes: `EmpenosApi.crear`, `actualizar`, `obtener`; `Api.get('/clientes')` para el autocompletado (mismo patrón que `prestamo-form`, `displayCliente`).
- Produces: componente `EmpenoForm`.

**Comportamiento:**
- Campos: cliente (autocompletado), tipo de artículo (radio Vehículo / Artículo general), monto prestado, tasa % (select 1–100, como en préstamos), periodo (Día / Semana / Mes, por defecto Mes), periodos mínimos, periodos máximos, fecha de ingreso (por defecto hoy), notas.
- Artículo: descripción, categoría, estado físico, ubicación, valor de avalúo; si es vehículo, además placa, marca, modelo, año, color, chasis, motor y kilometraje. Placa, marca, modelo y año son obligatorios **solo** para vehículo.
- Vista previa (sin cálculo local): fecha mínima y máxima calculadas en el cliente **solo como guía visual** con la misma regla de mes calendario, e interés por periodo = `monto × tasa / 100`, con la nota "El valor final lo calcula el sistema".
- Al editar un empeño con pagos (`pagos.length > 0`), los campos financieros quedan deshabilitados con el aviso "No se pueden cambiar las condiciones de un empeño con pagos".
- Al guardar: navegar al detalle; los errores 400/409 del backend se muestran arriba del formulario con su `message`.

- [ ] **Step 1: Pruebas que fallan:** al pasar de GENERAL a VEHICULO, `placa` se vuelve `required`; al volver a GENERAL, los campos de vehículo se limpian y no van en el payload; con un empeño cargado que tiene pagos, `montoPrestado` está `disabled`; `periodosMaximos < periodosMinimos` invalida el formulario.
- [ ] **Step 2: Run** `npx ng test --watch=false --include='**/empeno-form.spec.ts'` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** → PASS; `npx ng build`.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): formulario de empeño"`

---

### Task 4: Detalle, pagos, salida y eliminación

**Files:**
- Create: `src/app/dashboard/pages/empenos/empeno-detalle/*`, `empeno-pago-dialog/*` (+ `.spec.ts` de ambos)
- Modify: `src/app/dashboard/dashboard-module.ts` (ruta `empenos/:id`)

**Interfaces:**
- Consumes: `EmpenosApi.obtener`, `liquidacion`, `registrarPago`, `editarPago`, `eliminarPago`, `registrarSalida`, `eliminar`.
- Produces: componentes `EmpenoDetalle` y `EmpenoPagoDialog` (`MatDialog`; datos de entrada `{ empeno: EmpenoDetalle; pago?: PagoEmpeno }`).

**Comportamiento:**
- Encabezado: código, chip de estado, cliente (enlace a sus empeños), artículo.
- Tarjeta **Liquidación a hoy** (de `liquidacion`): periodos transcurridos, periodos adeudados, interés por periodo, interés adeudado, saldo de capital, **total para rescatar**, fecha mínima y fecha máxima, y el código de consulta del cliente con un botón de copiar.
- Acciones según el estado efectivo:
  - ACTIVO/VENCIDO: **Pagar intereses (refrendo)**, **Abonar a capital**, **Rescatar** (el monto se precarga con `totalParaRescatar`).
  - Solo VENCIDO: **Registrar salida** (Vendido / Adjudicado, monto y motivo).
  - Admin y no eliminado: **Editar** y **Eliminar**.
- Diálogo de pago: para refrendo, el usuario elige los periodos y el monto se calcula como `periodos × interesPorPeriodo` del backend (solo lectura); para abono y rescate, el monto es editable. Muestra el `message` del backend si responde 400/409 y **no** se cierra.
- Tabla de pagos (fecha, tipo, monto, interés, capital, saldo después) con Editar y Eliminar por fila si es admin.
- Línea de tiempo de movimientos (fecha, tipo, usuario, detalle).

- [ ] **Step 1: Pruebas que fallan:** un empeño ACTIVO no muestra "Registrar salida" y uno VENCIDO sí; el diálogo de refrendo con 2 periodos y `interesPorPeriodo = 50000` envía `{ tipo: 'INTERES', periodosCubiertos: 2, monto: 100000 }`; ante un error 400 `{ message: 'El monto no cuadra' }` el diálogo sigue abierto y muestra ese texto; un usuario no admin no ve los botones de editar o eliminar pagos.
- [ ] **Step 2: Run** `npx ng test --watch=false --include='**/{empeno-detalle,empeno-pago-dialog}.spec.ts'` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** → PASS; `npx ng build`.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): detalle, pagos, salida y eliminación"`

---

### Task 5: Entradas y salidas, empeños por cliente y tarjeta en reportes

**Files:**
- Create: `src/app/dashboard/pages/empenos/empenos-movimientos/*`
- Modify: `src/app/dashboard/dashboard-module.ts` (ruta `empenos/movimientos`, **antes** de `empenos/:id`)
- Modify: `src/app/dashboard/pages/clientes-list/clientes-list.html` (botón "Empeños" por fila → `/dashboard/empenos?clienteId=ID`)
- Modify: `src/app/dashboard/pages/reportes-list/reportes-list.html` (tarjeta "Empeños — entradas y salidas")

**Interfaces:**
- Consumes: `EmpenosApi.movimientos`, `porCliente`.
- Produces: componente `EmpenosMovimientos`. Cuando `EmpenosList` recibe `clienteId`, muestra arriba los totales de `porCliente` (activos, saldo de capital, interés adeudado, total para rescatar).

**Comportamiento:** el reporte filtra por rango (por defecto el mes actual) y tipo, muestra fecha, tipo, código (enlace al detalle), cliente, usuario y detalle, y exporta a CSV con el mismo método que use la lista de pagos (o `Blob` + descarga si no existe ninguno).

- [ ] **Step 1: Implementar** pantalla, rutas y enlaces.
- [ ] **Step 2: Verificar** `npx ng build` sin errores y `npx ng test --watch=false` con todas las suites en PASS.
- [ ] **Step 3: Prueba manual** con el backend local del plan 1/3 (`environment.ts` apuntando a `http://localhost:3000`, **sin commitear ese cambio**): crear empeño de vehículo y uno general, refrendar, abonar, rescatar, dejar uno vencido (fecha de ingreso antigua) y registrar su salida, eliminar uno, verlo con "Mostrar eliminados", revisar el reporte de movimientos y los empeños desde la lista de clientes.
- [ ] **Step 4: Commit** `git commit -m "feat(empenos): reporte de movimientos y acceso por cliente"`
