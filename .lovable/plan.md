# Plan: Renovación de contratos + Aprobaciones por Superadmin

## 1. Login separado superadmin
- En `src/pages/Login.tsx` aceptar dos credenciales fijas:
  - `admin` / `admin` → usuario operativo actual
  - `superadmin` / `superadmin` → cuenta de autorización
- Guardar el rol en `localStorage` (`app_role = "admin" | "superadmin"`) para que la app sepa qué mostrar.
- Detrás sigue usando la misma cuenta de Cloud Auth (el rol es visual/de aplicación, no de base de datos).

## 2. Nueva tabla `cambios_pendientes`
Campos: `id`, `tipo`, `entidad_tabla`, `entidad_id`, `payload` (jsonb con la operación completa: qué crear/actualizar/eliminar en qué tablas), `descripcion` (texto legible para el superadmin), `estado` (`pendiente` | `aprobado` | `rechazado`), `motivo_rechazo`, `creado_por`, `resuelto_por`, `created_at`, `resolved_at`.
- RLS abierta (mismo modelo actual de la app).
- GRANT a `authenticated`.

## 3. Qué acciones pasan por aprobación
Solo lo pedido: **locatarios y contratos**, con foco en renovaciones y cambios de monto/período.
- Editar ficha de locatario (nombre, DNI, contacto, propiedad asignada, fechas, monto base, plan de ajustes).
- Renovar contrato (ver punto 5).
- Editar o eliminar un contrato en la sección Contratos.
- Guardar el plan de ajustes / actualizar monto en Locatarios.

**No pasan por aprobación** (se aplican directo): generar recibos, marcar como pagados, servicios, locadores, propiedades, creación inicial de un locatario nuevo.

## 4. Comportamiento en la vista de admin
- Al intentar guardar un cambio de los que requieren aprobación, se inserta un registro en `cambios_pendientes` en vez de tocar la tabla real.
- Toast: *"Cambio enviado a aprobación"*.
- En la lista de locatarios y en la ficha, si hay un registro pendiente para esa entidad, mostrar un badge amarillo **"Cambio pendiente"**. Los datos visibles siguen siendo los viejos.
- Se puede tener un solo pendiente activo por entidad (si el usuario manda otro, reemplaza el anterior).

## 5. Botón "Renovar contrato"
- En la ficha de un locatario cuyo `fecha_fin` sea ≤ hoy + 30 días o esté vencida, aparece el botón **Renovar**.
- Al presionarlo, arma un payload de aprobación tipo `renovar_contrato` que, una vez aprobado, deja:
  - Se conservan: nombre, DNI, teléfono, email y la propiedad asignada.
  - Se limpian: `fecha_inicio`, `fecha_fin`, `intervalo_ajuste_meses`, `indice_actualizacion`, `fecha_ultimo_ajuste`, `monto_base` (a 0), y se borra el `historial_precios` del locatario.
- El admin tras aprobar podrá completar todos los campos nuevamente como si fuera un contrato nuevo.

## 6. Vista Superadmin
- Ruta nueva `/aprobaciones` (accesible solo si `app_role === "superadmin"`).
- Sidebar mínimo: sólo esta sección (superadmin no ve el resto de la app).
- Lista de pendientes ordenada por fecha, cada tarjeta muestra:
  - Tipo de cambio, entidad afectada (nombre del locatario o contrato).
  - Descripción legible ("Cambiar teléfono de Juan Pérez de X a Y", "Renovar contrato de Marcelino", "Actualizar monto del período 3 a $Z").
  - Botones **Aprobar** y **Rechazar** (rechazar pide motivo opcional).
- Al aprobar: se ejecuta el payload contra las tablas reales y el registro pasa a `aprobado`.
- Al rechazar: se descarta, queda como histórico con motivo.

## 7. Sección técnica (implementación)

**Migración**: crear tabla `cambios_pendientes` con GRANTs y RLS abierta.

**Nuevo archivo** `src/lib/aprobaciones.ts`:
- `enqueueChange(tipo, entidadId, descripcion, payload)` → inserta en `cambios_pendientes` (o reemplaza el previo de la misma entidad+tipo).
- `applyChange(row)` → dispatcher que ejecuta el payload según `tipo`:
  - `editar_locatario`: update en `locatarios`.
  - `editar_lp`: update/insert/delete en `locatario_propiedades` + `historial_precios`.
  - `renovar_contrato`: limpia campos del locatario y su LP + borra historial.
  - `editar_contrato`: update/delete en `contratos`.
- `getPending(entidadId)` para el badge.

**Rol de sesión**:
- `Login.tsx`: al validar credenciales, guardar `localStorage.setItem("app_role", ...)`.
- `Index.tsx`: leer rol; si es `superadmin`, montar sólo el layout con `/aprobaciones`. Si es `admin`, layout actual pero sin acceso a `/aprobaciones`.
- `Sidebar.tsx`: ocultar/mostrar links según rol.

**Locatarios.tsx**:
- El handler `handleSave` en modo edición ya no escribe directo: llama a `enqueueChange("editar_locatario", ...)`.
- Botón nuevo "Renovar" (visible si contrato vencido o próximo a vencer) → `enqueueChange("renovar_contrato", ...)`.
- Query adicional para pendientes → badge "Cambio pendiente" por fila.
- El guardado del plan de ajustes también pasa por `enqueueChange("editar_lp", ...)`.

**Contratos.tsx**:
- Editar/eliminar existentes pasan por `enqueueChange`. Crear un contrato nuevo se aplica directo (no requiere aprobación según respuestas).

**Nueva página** `src/pages/Aprobaciones.tsx` con la UI de revisión.

**Ruteo** en `src/pages/Index.tsx`: agregar `Aprobaciones` como ruta y controlarla por rol.

## 8. Riesgos / notas
- Como la auth real es una única cuenta compartida, el rol vive en el cliente. Un usuario con conocimiento técnico podría cambiar `localStorage` y ver el panel de superadmin. Alcanza para el uso pretendido (dos personas de confianza), pero no es una barrera de seguridad estricta.
- Si querés endurecerlo más adelante, hay que armar cuentas de Cloud Auth separadas y user_roles server-side; queda fuera de este cambio salvo que lo pidas.
