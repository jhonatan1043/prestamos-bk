# Empeños (3/3) — App Flutter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a `Prestamosfn` la feature **Empeños**: listar, registrar, ver detalle con liquidación, pagar intereses, abonar, rescatar y registrar salida; editar solo si el rol es admin; **nunca eliminar**. También la pantalla de consulta del cliente final ("Mis empeños").

**Architecture:** Feature nueva `lib/features/empenos/` con `data/` (modelos y repositorio) y `presentation/` (pantallas), con la estructura de `prestamos`. Las escrituras de empeños **requieren conexión**: se añaden a `ApiService` dos métodos que no encolan (`postOnline`, `putOnline`), sin cambiar los existentes.

**Tech Stack:** Flutter 3.44 / Dart 3.9, `http`, `intl`, `share_plus` (ya instalados), `flutter_test`.

**Spec:** `prestamos-bk/docs/superpowers/specs/2026-10-15-empenos-design.md` (§6.3, §8.2, §8.3). **Depende de:** plan 1/3.

## Global Constraints

- Repo: `C:\Users\PoseidonDev\Documents\IATech\Prestamosfn`, rama nueva `feature/empenos` desde `master`. **Antes de empezar:** los cambios de seguridad de esta sesión (`token_storage.dart`, `flutter_secure_storage`, prints) siguen sin commitear; pedir al usuario que los commitee primero.
- Solo aditivo. Archivos existentes que se pueden tocar: `lib/core/network/api_service.dart` (2 métodos nuevos), `lib/main.dart` (rutas), `lib/features/home/presentation/dashboard_screen.dart` y `lib/features/user/presentation/user_dashboard_screen.dart` (entradas de menú).
- **Sin botón ni llamada de eliminar** en ninguna pantalla de la app.
- Editar empeño: visible solo si `TokenStorage.getRole()` en minúsculas es `admin` o `administrador`.
- Sin conexión: las pantallas de escritura muestran `Esta acción requiere conexión a internet` y no envían nada.
- La app **no calcula** intereses: usa `liquidacion` del backend. Montos con `NumberFormat('#,##0', 'es_CO')` y el símbolo de la divisa de la empresa (`EmpresaConfigService`), como el resto de pantallas.
- Colores y estilo: primario `0xFF0C3B2E`, fondo `0xFFEFF6F2`, los mismos de la app.

## Review Focus

1. **Sin conexión al guardar** → no se encola en `SyncQueueDb` ni aparece un "guardado" falso. *(Test en Task 1.)*
2. **Respuesta 400/409 del backend** (monto que no cuadra, empeño vencido, etc.) → se muestra el `message` y el formulario conserva lo escrito. *(Test en Task 4.)*
3. **Cobrador** → no ve "Editar" en el detalle y la lista solo muestra lo que devuelve el backend (lo suyo). *(Test en Task 3.)*
4. **Montos grandes de vehículos** (p. ej. 85.000.000) → el campo con separador de miles se convierte a número sin perder dígitos. *(Test en Task 2.)*
5. **Fechas del backend en UTC** → se muestran en fecha local sin correrse un día. *(Test en Task 1.)*

---

## File Structure

```
lib/core/network/api_service.dart                          (modify) + postOnline, putOnline
lib/features/empenos/
  data/empeno_models.dart                                  EmpenoResumen, EmpenoDetalle, ArticuloEmpeno, PagoEmpeno, MovimientoEmpeno, Liquidacion, ResumenEmpenos, PortalEmpenos
  data/empeno_repository.dart                              llamadas a /empenos
  presentation/empeno_list_screen.dart                     lista + filtros + resumen
  presentation/empeno_form_screen.dart                     crear / editar (admin)
  presentation/empeno_detalle_screen.dart                  detalle, liquidación, pagos, movimientos, acciones
  presentation/empeno_pago_sheet.dart                      bottom sheet: refrendo, abono, rescate
  presentation/empeno_salida_sheet.dart                    bottom sheet: salida (vencidos)
  presentation/mis_empenos_screen.dart                     portal del cliente
  presentation/widgets/estado_chip.dart, montos.dart        utilidades de UI
lib/main.dart                                              (modify) rutas
lib/features/home/presentation/dashboard_screen.dart       (modify) sección "Empeños" en el drawer
lib/features/user/presentation/user_dashboard_screen.dart  (modify) entrada "Empeños" en el drawer
test/features/empenos/empeno_models_test.dart
test/features/empenos/empeno_repository_test.dart
test/features/empenos/empeno_screens_test.dart
```

---

### Task 1: `ApiService` sin cola, modelos y repositorio

**Files:**
- Modify: `lib/core/network/api_service.dart`
- Create: `lib/features/empenos/data/empeno_models.dart`, `empeno_repository.dart`
- Test: `test/features/empenos/empeno_models_test.dart`, `empeno_repository_test.dart`

**Interfaces:**
- Produces:
  - `ApiService.postOnline(String endpoint, Map<String, dynamic> data) → Future<http.Response>` y `putOnline(...)`: si no hay conexión devuelven `http.Response('{"message":"Esta acción requiere conexión a internet"}', 503)`; nunca llaman a `SyncService.encolar`; aplican `_checkUnauthorized`. Para poder probarlo, `ApiService` recibe un `http.Client? client` opcional en el constructor (por defecto `http.Client()`), usado **solo** por los métodos nuevos.
  - Modelos con `factory fromJson(Map<String, dynamic>)` para cada respuesta del plan 1/3. Decimales del backend (pueden llegar como `String` o `num`) → `double` con `double.parse('$v')`. Fechas → `DateTime.parse(v).toLocal()`.
  - `class EmpenoException implements Exception { final int status; final String message; }` — `message` sale del campo `message` del backend (si es lista, unida con `, `).
  - `EmpenoRepository(ApiService api)`: `listar({String? estado, String? q, int? clienteId, int? vencenEnDias}) → Future<List<EmpenoResumen>>`, `resumen()`, `obtener(int id) → Future<EmpenoDetalle>`, `liquidacion(int id)`, `crear(Map<String, dynamic> body) → Future<EmpenoDetalle>`, `actualizar(int id, Map body)`, `registrarPago(int id, Map body)`, `registrarSalida(int id, Map body)`, `consultarPortal({required String schemaName, required String identificacion, required String codigo}) → Future<PortalEmpenos>`. Ante una respuesta no 2xx lanzan `EmpenoException`. **No** existe método de eliminar.

- [ ] **Step 1: Pruebas que fallan**

```dart
test('decimales como string y fechas UTC a local', () {
  final l = Liquidacion.fromJson({'interesAdeudado': '100000.00', 'totalParaRescatar': 1100000, 'fechaMaxima': '2026-05-01T05:00:00.000Z', ...});
  expect(l.interesAdeudado, 100000);
  expect(l.fechaMaxima.isUtc, isFalse);
});
test('postOnline sin conexión no encola y devuelve 503', () async { /* ConnectivityService fake offline; MockClient de package:http/testing.dart sin llamadas; SyncQueueDb sin filas nuevas */ });
test('error 400 se convierte en EmpenoException con el message del backend', () async { /* MockClient → 400 {"message":["El monto no cuadra"]} → throwsA(isA<EmpenoException>().having((e) => e.message, 'message', 'El monto no cuadra')) */ });
test('listar arma el query sin parámetros vacíos', () async { /* espera GET /empenos?estado=VENCIDO */ });
```

- [ ] **Step 2: Run** `flutter test test/features/empenos` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** `flutter test test/features/empenos` → PASS; `flutter analyze lib/core lib/features/empenos` → `No issues found!`
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): modelos, repositorio y peticiones sin cola offline"`

---

### Task 2: Formulario de registrar y editar

**Files:**
- Create: `lib/features/empenos/presentation/empeno_form_screen.dart`, `widgets/montos.dart`
- Test: `test/features/empenos/empeno_screens_test.dart` (grupo `form`)

**Interfaces:**
- Consumes: `EmpenoRepository.crear`, `actualizar`, `obtener`; `ClienteRepository` existente para buscar clientes.
- Produces: `EmpenoFormScreen({EmpenoDetalle? empeno})` (sin `empeno` = crear). `parseMonto(String texto) → double` en `widgets/montos.dart` (quita separadores de miles).

**Comportamiento:** los mismos campos y reglas que el formulario del panel (plan 2/3, Task 3): cliente (buscador), tipo de artículo con campos de vehículo condicionales, monto con separador de miles, tasa 1–100 (dropdown como en préstamos), periodo, periodos mínimos y máximos, fecha de ingreso, notas y datos del artículo. Si el empeño tiene pagos, los campos financieros quedan deshabilitados. Al crear con éxito, se muestra un diálogo con el **código de consulta** y el botón **Compartir** (`Share.share('Tu código de consulta de empeño {codigo} es {codigoConsulta}')`), y luego se abre el detalle.

- [ ] **Step 1: Pruebas que fallan:** `parseMonto('85.000.000')` y `parseMonto('85,000,000')` dan `85000000`; elegir "Vehículo" muestra el campo Placa y lo exige; con un empeño que tiene pagos, el campo Monto no es editable.
- [ ] **Step 2: Run** `flutter test test/features/empenos/empeno_screens_test.dart --name form` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** → PASS; `flutter analyze lib/features/empenos`.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): formulario de empeño en la app"`

---

### Task 3: Lista, detalle y menú

**Files:**
- Create: `lib/features/empenos/presentation/empeno_list_screen.dart`, `empeno_detalle_screen.dart`, `widgets/estado_chip.dart`
- Modify: `lib/main.dart` (rutas `'/empeno_list'`, `'/empeno_create'`), `dashboard_screen.dart` (sección **Empeños** en el drawer, después de **Mercancía**, con "Empeños" y "Nuevo empeño"), `user_dashboard_screen.dart` (mismas dos entradas)
- Test: `empeno_screens_test.dart` (grupo `detalle`)

**Interfaces:**
- Consumes: `EmpenoRepository.listar`, `resumen`, `obtener`.
- Produces: `EmpenoListScreen`, `EmpenoDetalleScreen({required int empenoId})`, `EstadoChip(String estado)`.

**Comportamiento:**
- **Lista:** tarjetas de resumen, chips de filtro por estado (Todos / Activos / Vencidos / Por vencer / Recuperados / Salidas), buscador por código, placa o descripción, *pull to refresh*, FAB "Nuevo empeño". Cada tarjeta muestra código, cliente, artículo, saldo, fecha máxima y el chip de estado.
- **Detalle:** artículo, cliente, código de consulta con botón **Compartir**, tarjeta de liquidación (igual que en el panel), pagos, movimientos y botones de acción según el estado (pagar intereses, abonar, rescatar; "Registrar salida" solo si está VENCIDO). "Editar" solo para admin. **No hay acción de eliminar.**

- [ ] **Step 1: Pruebas que fallan:** con el rol `USER` el detalle no muestra "Editar"; con `ADMIN` sí; en ningún caso aparece el texto ni el icono de eliminar (`find.byIcon(Icons.delete)` → nada); un empeño ACTIVO no muestra "Registrar salida".
- [ ] **Step 2: Run** `flutter test test/features/empenos/empeno_screens_test.dart --name detalle` → FAIL.
- [ ] **Step 3: Implementar** pantallas, rutas y entradas de menú.
- [ ] **Step 4: Run** → PASS; `flutter analyze` sin errores nuevos.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): lista, detalle y acceso desde el menú"`

---

### Task 4: Pagos, rescate y salida

**Files:**
- Create: `lib/features/empenos/presentation/empeno_pago_sheet.dart`, `empeno_salida_sheet.dart`
- Test: `empeno_screens_test.dart` (grupo `pagos`)

**Interfaces:**
- Consumes: `EmpenoRepository.registrarPago`, `registrarSalida`, `liquidacion`.
- Produces: `mostrarPagoSheet(BuildContext, EmpenoDetalle, TipoPagoEmpeno) → Future<bool>` y `mostrarSalidaSheet(BuildContext, EmpenoDetalle) → Future<bool>` (`true` si se guardó; el detalle recarga).

**Comportamiento:** igual que el diálogo del panel (plan 2/3, Task 4). Refrendo: el usuario elige los periodos (mínimo `max(periodosAdeudados, 1)`) y el monto es `periodos × interesPorPeriodo`, en solo lectura. Abono: monto editable, con la ayuda "Primero se cubre el interés pendiente: {interesAdeudado}". Rescate: monto fijo `totalParaRescatar`. Salida: Vendido o Adjudicado, monto y motivo. Ante un error se muestra `EmpenoException.message` dentro del sheet, que no se cierra.

- [ ] **Step 1: Pruebas que fallan:** refrendo con `interesPorPeriodo = 50000` y 2 periodos envía `{tipo: 'INTERES', periodosCubiertos: 2, monto: 100000}`; un error 400 muestra el mensaje y el sheet sigue abierto; el rescate envía `monto = totalParaRescatar`.
- [ ] **Step 2: Run** `flutter test test/features/empenos/empeno_screens_test.dart --name pagos` → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(empenos): pagos, rescate y salida en la app"`

---

### Task 5: "Mis empeños" (portal del cliente)

**Files:**
- Create: `lib/features/empenos/presentation/mis_empenos_screen.dart`
- Modify: `lib/main.dart` (ruta `'/mis_empenos'`)

**Interfaces:**
- Consumes: `EmpenoRepository.consultarPortal`, `TokenStorage.getSchemaName()`.
- Produces: `MisEmpenosScreen`. **No** se enlaza todavía desde "Ingresar como cliente": eso se hace en la tarea aparte de reorganizar esa pantalla (spec §11).

**Comportamiento:** campos Identificación y Código de consulta (en mayúsculas, 6 caracteres). Si no hay empresa guardada, redirige a `/tenant_select`. Muestra, en solo lectura y sin botones de acción, las tarjetas de cada empeño: artículo, fechas, estado, saldo, interés adeudado y total para rescatar. Ante 404 muestra `No se encontró información con esos datos`; ante 429, `Demasiados intentos, intenta más tarde`.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar:** `flutter analyze` sin errores nuevos y `flutter test` con todas las pruebas en PASS (incluida `test/widget_test.dart`).
- [ ] **Step 3: Prueba manual en dispositivo** contra el backend local (cambiar `AppConfig.apiBaseUrl` a la IP local **sin commitear**): un admin crea un empeño de vehículo y lo comparte; un cobrador crea otro y no ve el del admin; refrendo, abono, rescate; modo avión → "requiere conexión"; consulta en "Mis empeños" con código correcto e incorrecto.
- [ ] **Step 4: Commit** `git commit -m "feat(empenos): consulta de empeños para el cliente"`
