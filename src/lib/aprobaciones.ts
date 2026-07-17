import { supabase } from "@/integrations/supabase/client";
import { getPeriodos, getCurrentPeriodoIdx, toLocalISO } from "./periodos";

export type CambioTipo =
  | "editar_locatario"
  | "eliminar_locatario"
  | "renovar_contrato"
  | "editar_contrato"
  | "eliminar_contrato";


export type PropFormPayload = {
  id?: string; // existing locatario_propiedades id (undefined = nueva relación)
  propiedad_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto_base: number;
  intervalo_ajuste_meses: number;
  indice_actualizacion: string;
  notas: string;
  pending_ajustes: Record<number, number>;
};

export type EditarLocatarioPayload = {
  locatario_id: string;
  form: { nombre: string; dni: string; telefono: string; email: string; notas: string };
  propForms: PropFormPayload[];
  removedLpIds: string[];
};

export type RenovarPayload = { locatario_id: string; locatario_nombre: string };
export type EditarContratoPayload = { contrato_id: string; changes: Record<string, unknown> };
export type EliminarContratoPayload = { contrato_id: string };

export type CambioPendienteRow = {
  id: string;
  tipo: CambioTipo;
  entidad_tabla: string;
  entidad_id: string | null;
  descripcion: string;
  payload: any;
  estado: "pendiente" | "aprobado" | "rechazado";
  motivo_rechazo: string | null;
  creado_por: string | null;
  resuelto_por: string | null;
  resolved_at: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export function getRole(): "admin" | "superadmin" | null {
  const r = localStorage.getItem("app_role");
  if (r === "admin" || r === "superadmin") return r;
  return null;
}

export async function enqueueChange(params: {
  tipo: CambioTipo;
  entidad_tabla: string;
  entidad_id: string;
  descripcion: string;
  payload: unknown;
}) {
  // Reemplazar cualquier pendiente previo para la misma entidad + tipo
  await sb
    .from("cambios_pendientes")
    .delete()
    .eq("entidad_tabla", params.entidad_tabla)
    .eq("entidad_id", params.entidad_id)
    .eq("tipo", params.tipo)
    .eq("estado", "pendiente");

  const { error } = await sb.from("cambios_pendientes").insert({
    tipo: params.tipo,
    entidad_tabla: params.entidad_tabla,
    entidad_id: params.entidad_id,
    descripcion: params.descripcion,
    payload: params.payload,
    estado: "pendiente",
    creado_por: getRole() ?? "admin",
  });
  if (error) throw error;
}

export async function approveChange(row: CambioPendienteRow) {
  switch (row.tipo) {
    case "editar_locatario":
      await applyEditarLocatario(row.payload as EditarLocatarioPayload);
      break;
    case "eliminar_locatario":
      await applyEliminarLocatario(row.payload as { locatario_id: string });
      break;
    case "renovar_contrato":
      await applyRenovar(row.payload as RenovarPayload);
      break;
    case "editar_contrato":
      await applyEditarContrato(row.payload as EditarContratoPayload);
      break;
    case "eliminar_contrato":
      await applyEliminarContrato(row.payload as EliminarContratoPayload);
      break;
  }

  const { error } = await sb
    .from("cambios_pendientes")
    .update({
      estado: "aprobado",
      resolved_at: new Date().toISOString(),
      resuelto_por: "superadmin",
    })
    .eq("id", row.id);
  if (error) throw error;
}

export async function rejectChange(id: string, motivo: string) {
  const { error } = await sb
    .from("cambios_pendientes")
    .update({
      estado: "rechazado",
      motivo_rechazo: motivo || null,
      resolved_at: new Date().toISOString(),
      resuelto_por: "superadmin",
    })
    .eq("id", id);
  if (error) throw error;
}

export async function getPendingForEntity(entidad_tabla: string, entidad_id: string) {
  const { data } = await sb
    .from("cambios_pendientes")
    .select("id, tipo, descripcion, created_at")
    .eq("entidad_tabla", entidad_tabla)
    .eq("entidad_id", entidad_id)
    .eq("estado", "pendiente");
  return (data ?? []) as { id: string; tipo: string; descripcion: string; created_at: string }[];
}

export async function getAllPending(): Promise<CambioPendienteRow[]> {
  const { data, error } = await sb
    .from("cambios_pendientes")
    .select("*")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CambioPendienteRow[];
}

// ─── Ejecutores por tipo ──────────────────────────────────────────────────

async function applyEditarLocatario(p: EditarLocatarioPayload) {
  const { locatario_id, form, propForms, removedLpIds } = p;

  const { error: upErr } = await supabase
    .from("locatarios")
    .update({
      nombre: form.nombre,
      dni: form.dni || null,
      telefono: form.telefono || null,
      email: form.email || null,
      notas: form.notas || null,
    })
    .eq("id", locatario_id);
  if (upErr) throw upErr;

  if (removedLpIds && removedLpIds.length > 0) {
    const { error } = await supabase.from("locatario_propiedades").delete().in("id", removedLpIds);
    if (error) throw error;
  }

  for (const pf of propForms) {
    if (!pf.propiedad_id) continue;
    const periodos = getPeriodos(pf.fecha_inicio, pf.fecha_fin || null, pf.intervalo_ajuste_meses);
    const currentIdx = getCurrentPeriodoIdx(periodos);
    let activeIdx = currentIdx;
    if (periodos.length > 0) {
      for (let i = periodos.length - 1; i >= 0; i--) {
        const v = Number(pf.pending_ajustes?.[i] ?? 0);
        if (v > 0) {
          activeIdx = Math.max(currentIdx, i);
          break;
        }
      }
    }
    const montoActual =
      periodos.length === 0
        ? Number(pf.monto_base) || 0
        : Number(pf.pending_ajustes?.[activeIdx] ?? pf.monto_base) || 0;
    const fechaUltimoAjuste = periodos[activeIdx] ? toLocalISO(periodos[activeIdx]) : null;

    if (pf.id) {
      await supabase
        .from("historial_precios")
        .delete()
        .eq("locatario_id", locatario_id)
        .eq("propiedad_id", pf.propiedad_id);
      for (let i = 0; i < activeIdx; i++) {
        const monto = Number(pf.pending_ajustes?.[i] ?? 0);
        if (!monto) continue;
        await supabase.from("historial_precios").insert({
          locatario_id,
          propiedad_id: pf.propiedad_id,
          monto,
          fecha_desde: periodos[i] ? toLocalISO(periodos[i]) : null,
          fecha_hasta: periodos[i + 1] ? toLocalISO(periodos[i + 1]) : null,
        });
      }
      const { error } = await supabase
        .from("locatario_propiedades")
        .update({
          fecha_inicio: pf.fecha_inicio || null,
          fecha_fin: pf.fecha_fin || null,
          monto_base: montoActual,
          intervalo_ajuste_meses: pf.intervalo_ajuste_meses,
          indice_actualizacion: pf.indice_actualizacion,
          notas: pf.notas || null,
          fecha_ultimo_ajuste: fechaUltimoAjuste,
        })
        .eq("id", pf.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("locatario_propiedades").insert({
        locatario_id,
        propiedad_id: pf.propiedad_id,
        fecha_inicio: pf.fecha_inicio || null,
        fecha_fin: pf.fecha_fin || null,
        monto_base: montoActual || pf.monto_base,
        intervalo_ajuste_meses: pf.intervalo_ajuste_meses,
        indice_actualizacion: pf.indice_actualizacion,
        notas: pf.notas || null,
        fecha_ultimo_ajuste: fechaUltimoAjuste,
      });
      if (error) throw error;
    }
  }
}

async function applyRenovar(p: RenovarPayload) {
  // Borrar historial de precios del locatario
  await supabase.from("historial_precios").delete().eq("locatario_id", p.locatario_id);
  // Vaciar todas sus relaciones locatario_propiedades (mantiene propiedad asignada)
  const { data: lps } = await supabase
    .from("locatario_propiedades")
    .select("id")
    .eq("locatario_id", p.locatario_id);
  for (const lp of lps ?? []) {
    await supabase
      .from("locatario_propiedades")
      .update({
        fecha_inicio: null,
        fecha_fin: null,
        monto_base: 0,
        intervalo_ajuste_meses: null,
        indice_actualizacion: null,
        fecha_ultimo_ajuste: null,
        notas: null,
      })
      .eq("id", lp.id);
  }
}

async function applyEditarContrato(p: EditarContratoPayload) {
  const { error } = await supabase
    .from("contratos")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(p.changes as any)
    .eq("id", p.contrato_id);
  if (error) throw error;
}

async function applyEliminarContrato(p: EliminarContratoPayload) {
  const { error } = await supabase.from("contratos").delete().eq("id", p.contrato_id);
  if (error) throw error;
}

async function applyEliminarLocatario(p: { locatario_id: string }) {
  const { error } = await supabase.from("locatarios").delete().eq("id", p.locatario_id);
  if (error) throw error;
}

