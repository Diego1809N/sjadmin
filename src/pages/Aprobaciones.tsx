import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ShieldCheck, Check, X, Clock, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
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
  renovar_contrato: "Renovación de contrato",
  editar_contrato: "Edición de contrato",
  eliminar_contrato: "Eliminación de contrato",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function renderPayloadPreview(row: CambioPendienteRow) {
  try {
    if (row.tipo === "editar_locatario") {
      const p = row.payload || {};
      const f = p.form || {};
      return (
        <ul className="text-xs text-muted-foreground space-y-0.5 mt-2">
          <li><strong>Nombre:</strong> {f.nombre || "—"}</li>
          <li><strong>DNI:</strong> {f.dni || "—"}</li>
          <li><strong>Teléfono:</strong> {f.telefono || "—"}</li>
          <li><strong>Email:</strong> {f.email || "—"}</li>
          <li><strong>Propiedades en el cambio:</strong> {(p.propForms ?? []).length}</li>
          {p.removedLpIds?.length > 0 && <li><strong>Propiedades a quitar:</strong> {p.removedLpIds.length}</li>}
        </ul>
      );
    }
    if (row.tipo === "renovar_contrato") {
      return (
        <p className="text-xs text-muted-foreground mt-2">
          Se limpiarán fechas, montos y plan de ajustes. Se mantendrán datos personales y propiedad asignada.
        </p>
      );
    }
    if (row.tipo === "editar_contrato" || row.tipo === "eliminar_contrato") {
      return (
        <pre className="text-[11px] bg-secondary/50 rounded p-2 mt-2 overflow-x-auto max-h-40">
          {JSON.stringify(row.payload, null, 2)}
        </pre>
      );
    }
  } catch {
    /* noop */
  }
  return null;
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
            Cambios enviados desde la cuenta admin. Nada se aplica en la base de datos hasta que los apruebes acá.
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
                    {renderPayloadPreview(row)}
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
