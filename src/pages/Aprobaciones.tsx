import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ShieldCheck, Check, X, Clock, Loader2, LogOut, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getAllPending,
  approveChange,
  rejectChange,
  type CambioPendienteRow,
} from "@/lib/aprobaciones";

interface Props {
  onLogout: () => void;
}

const TIPO_LABEL: Record<string, string> = {
  editar_locatario: "Edición de locatario",
  eliminar_locatario: "Eliminación de locatario",
  renovar_contrato: "Renovación de contrato",
  editar_contrato: "Edición de contrato",
  eliminar_contrato: "Eliminación de contrato",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("es-AR");
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

function DiffRow({ label, before, after }: { label: string; before: unknown; after: unknown }) {
  const changed = fmtVal(before) !== fmtVal(after);
  return (
    <div className={`grid grid-cols-[140px_1fr_auto_1fr] gap-2 items-center text-xs py-1 px-2 rounded ${changed ? "bg-amber-50" : ""}`}>
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className={changed ? "text-muted-foreground line-through" : "text-foreground"}>{fmtVal(before)}</span>
      <ArrowRight className={`w-3 h-3 ${changed ? "text-amber-600" : "text-muted-foreground/40"}`} />
      <span className={changed ? "text-amber-900 font-semibold" : "text-foreground"}>{fmtVal(after)}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mt-3 mb-1">{children}</div>;
}

// ─── Diff por tipo ───────────────────────────────────────────────────

function EditarLocatarioDiff({ payload }: { payload: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["diff-loc", payload?.locatario_id],
    queryFn: async () => {
      const { data: loc } = await sb
        .from("locatarios")
        .select("*, locatario_propiedades(*, propiedades(direccion))")
        .eq("id", payload.locatario_id)
        .maybeSingle();
      return loc;
    },
    enabled: !!payload?.locatario_id,
  });

  if (isLoading) return <div className="text-xs text-muted-foreground mt-2">Cargando datos actuales...</div>;
  if (!data) return <div className="text-xs text-destructive mt-2">No se encontró el locatario.</div>;

  const f = payload.form || {};
  const currentLps: any[] = data.locatario_propiedades ?? [];
  const newLps: any[] = payload.propForms ?? [];
  const removed: string[] = payload.removedLpIds ?? [];

  return (
    <div className="mt-2 border border-border rounded-lg p-2 bg-secondary/30">
      <SectionTitle>Datos personales</SectionTitle>
      <DiffRow label="Nombre" before={data.nombre} after={f.nombre} />
      <DiffRow label="DNI" before={data.dni} after={f.dni} />
      <DiffRow label="Teléfono" before={data.telefono} after={f.telefono} />
      <DiffRow label="Email" before={data.email} after={f.email} />
      <DiffRow label="Notas" before={data.notas} after={f.notas} />

      <SectionTitle>Propiedades</SectionTitle>
      {newLps.length === 0 && <div className="text-xs text-muted-foreground px-2">Sin propiedades en el cambio.</div>}
      {newLps.map((pf, i) => {
        const cur = pf.id ? currentLps.find((lp) => lp.id === pf.id) : null;
        const dirLabel = cur?.propiedades?.direccion ?? "Propiedad";
        const isNueva = !pf.id;
        return (
          <div key={i} className="mt-2 border-t border-border pt-2">
            <div className="text-xs font-semibold text-foreground mb-1">
              {isNueva ? "🆕 Nueva: " : ""}{dirLabel}
            </div>
            <DiffRow label="Fecha inicio" before={cur?.fecha_inicio} after={pf.fecha_inicio} />
            <DiffRow label="Fecha fin" before={cur?.fecha_fin} after={pf.fecha_fin} />
            <DiffRow label="Monto base" before={cur?.monto_base} after={pf.monto_base} />
            <DiffRow label="Intervalo ajuste (m)" before={cur?.intervalo_ajuste_meses} after={pf.intervalo_ajuste_meses} />
            <DiffRow label="Índice" before={cur?.indice_actualizacion} after={pf.indice_actualizacion} />
            <DiffRow label="Notas" before={cur?.notas} after={pf.notas} />
            {pf.pending_ajustes && Object.keys(pf.pending_ajustes).length > 0 && (
              <div className="mt-1 text-[11px] text-muted-foreground px-2">
                <strong>Plan de ajustes propuesto:</strong>{" "}
                {Object.entries(pf.pending_ajustes)
                  .map(([k, v]) => `P${Number(k) + 1}: $${fmtVal(v)}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        );
      })}

      {removed.length > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <SectionTitle>Propiedades a quitar</SectionTitle>
          {removed.map((rid) => {
            const cur = currentLps.find((lp) => lp.id === rid);
            return (
              <div key={rid} className="text-xs text-destructive px-2">
                ✗ {cur?.propiedades?.direccion ?? rid}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EliminarLocatarioDiff({ payload }: { payload: any }) {
  const { data } = useQuery({
    queryKey: ["diff-del-loc", payload?.locatario_id],
    queryFn: async () => {
      const { data } = await sb.from("locatarios").select("nombre, dni, telefono").eq("id", payload.locatario_id).maybeSingle();
      return data;
    },
    enabled: !!payload?.locatario_id,
  });
  return (
    <div className="mt-2 border border-destructive/30 rounded-lg p-2 bg-destructive/5 text-xs">
      <div className="font-semibold text-destructive mb-1">Se eliminará por completo:</div>
      <div><strong>Nombre:</strong> {data?.nombre ?? "—"}</div>
      <div><strong>DNI:</strong> {data?.dni ?? "—"}</div>
      <div><strong>Teléfono:</strong> {data?.telefono ?? "—"}</div>
    </div>
  );
}

function RenovarDiff({ payload }: { payload: any }) {
  const { data } = useQuery({
    queryKey: ["diff-renovar", payload?.locatario_id],
    queryFn: async () => {
      const { data } = await sb
        .from("locatarios")
        .select("nombre, locatario_propiedades(fecha_inicio, fecha_fin, monto_base, intervalo_ajuste_meses, indice_actualizacion, propiedades(direccion))")
        .eq("id", payload.locatario_id)
        .maybeSingle();
      return data;
    },
    enabled: !!payload?.locatario_id,
  });
  const lps: any[] = data?.locatario_propiedades ?? [];
  return (
    <div className="mt-2 border border-amber-300 rounded-lg p-2 bg-amber-50 text-xs">
      <div className="font-semibold text-amber-900 mb-1">
        Se conservan nombre, DNI, contacto y propiedad asignada. Se limpiarán:
      </div>
      {lps.length === 0 && <div className="text-muted-foreground">Sin propiedades cargadas.</div>}
      {lps.map((lp, i) => (
        <div key={i} className="mt-1 border-t border-amber-200 pt-1">
          <div className="font-semibold">{lp.propiedades?.direccion ?? "Propiedad"}</div>
          <DiffRow label="Fecha inicio" before={lp.fecha_inicio} after={null} />
          <DiffRow label="Fecha fin" before={lp.fecha_fin} after={null} />
          <DiffRow label="Monto base" before={lp.monto_base} after={0} />
          <DiffRow label="Intervalo (m)" before={lp.intervalo_ajuste_meses} after={null} />
          <DiffRow label="Índice" before={lp.indice_actualizacion} after={null} />
        </div>
      ))}
      <div className="mt-1 text-[11px] text-amber-800">También se borra el historial de precios.</div>
    </div>
  );
}

function EditarContratoDiff({ payload }: { payload: any }) {
  const { data } = useQuery({
    queryKey: ["diff-contrato", payload?.contrato_id],
    queryFn: async () => {
      const { data } = await sb.from("contratos").select("*").eq("id", payload.contrato_id).maybeSingle();
      return data;
    },
    enabled: !!payload?.contrato_id,
  });
  if (!data) return <div className="text-xs text-muted-foreground mt-2">Cargando...</div>;
  const changes = payload.changes ?? {};
  return (
    <div className="mt-2 border border-border rounded-lg p-2 bg-secondary/30">
      <SectionTitle>Campos a modificar</SectionTitle>
      {Object.keys(changes).length === 0 && <div className="text-xs text-muted-foreground px-2">Sin cambios.</div>}
      {Object.entries(changes).map(([k, v]) => (
        <DiffRow key={k} label={k} before={data[k]} after={v} />
      ))}
    </div>
  );
}

function EliminarContratoDiff({ payload }: { payload: any }) {
  const { data } = useQuery({
    queryKey: ["diff-del-contrato", payload?.contrato_id],
    queryFn: async () => {
      const { data } = await sb
        .from("contratos")
        .select("locatario_nombre, propiedad_direccion, fecha_inicio, fecha_fin, monto_inicial")
        .eq("id", payload.contrato_id)
        .maybeSingle();
      return data;
    },
    enabled: !!payload?.contrato_id,
  });
  return (
    <div className="mt-2 border border-destructive/30 rounded-lg p-2 bg-destructive/5 text-xs">
      <div className="font-semibold text-destructive mb-1">Se eliminará el contrato:</div>
      <div><strong>Locatario:</strong> {data?.locatario_nombre ?? "—"}</div>
      <div><strong>Propiedad:</strong> {data?.propiedad_direccion ?? "—"}</div>
      <div><strong>Vigencia:</strong> {data?.fecha_inicio ?? "?"} → {data?.fecha_fin ?? "?"}</div>
      <div><strong>Monto inicial:</strong> ${fmtVal(data?.monto_inicial)}</div>
    </div>
  );
}

function CambioDetalle({ row }: { row: CambioPendienteRow }) {
  switch (row.tipo) {
    case "editar_locatario": return <EditarLocatarioDiff payload={row.payload} />;
    case "eliminar_locatario": return <EliminarLocatarioDiff payload={row.payload} />;
    case "renovar_contrato": return <RenovarDiff payload={row.payload} />;
    case "editar_contrato": return <EditarContratoDiff payload={row.payload} />;
    case "eliminar_contrato": return <EliminarContratoDiff payload={row.payload} />;
    default: return null;
  }
}

export default function Aprobaciones({ onLogout }: Props) {
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const { data: pendientes = [], isLoading } = useQuery({
    queryKey: ["cambios_pendientes"],
    queryFn: getAllPending,
  });

  const approve = useMutation({
    mutationFn: (row: CambioPendienteRow) => approveChange(row),
    onSuccess: () => {
      toast.success("Cambio aprobado y aplicado");
      qc.invalidateQueries({ queryKey: ["cambios_pendientes"] });
    },
    onError: (e: Error) => toast.error("No se pudo aplicar el cambio: " + e.message),
  });

  const reject = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => rejectChange(id, motivo),
    onSuccess: () => {
      toast.success("Cambio rechazado");
      setRejectingId(null);
      setMotivo("");
      qc.invalidateQueries({ queryKey: ["cambios_pendientes"] });
    },
    onError: (e: Error) => toast.error("Error al rechazar: " + e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Panel de Aprobaciones</h1>
              <p className="text-xs text-muted-foreground">Sesión: superadmin</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cambios pendientes de autorización</h2>
          <p className="text-sm text-muted-foreground">
            Cada solicitud muestra el valor actual y la modificación pedida. Nada se aplica hasta que apruebes.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : pendientes.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay cambios pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendientes.map((row) => (
              <div key={row.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {TIPO_LABEL[row.tipo] ?? row.tipo}
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtDate(row.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-2">{row.descripcion}</p>
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-muted-foreground mt-2 px-2">
                      <span>Valor actual</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>Modificación solicitada</span>
                    </div>
                    <CambioDetalle row={row} />
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => approve.mutate(row)}
                      disabled={approve.isPending}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprobar
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(row.id);
                        setMotivo("");
                      }}
                      className="flex items-center gap-1.5 border border-border text-destructive text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-destructive/10"
                    >
                      <X className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                </div>

                {rejectingId === row.id && (
                  <div className="mt-3 border-t border-border pt-3 space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Motivo (opcional)
                    </label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Ej: falta información, valores incorrectos, etc."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setMotivo("");
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => reject.mutate({ id: row.id, motivo })}
                        disabled={reject.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        Confirmar rechazo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
