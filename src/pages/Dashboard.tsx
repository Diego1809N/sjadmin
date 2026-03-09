import { useState } from "react";
import { Building2, Users, UserCheck, FileText, Eye, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Recibo = {
  id: string;
  nro_serie: string;
  fecha: string;
  locatario_nombre: string;
  propiedad: string;
  monto: number;
  expensas: number;
  agua: number;
  luz: number;
  gas: number;
  arreglos: number;
  servicios: number;
  estado: string;
  fecha_entrega: string | null;
};

function getTotal(r: Recibo) {
  return (
    Number(r.monto) +
    Number(r.expensas) +
    Number(r.agua) +
    Number(r.luz) +
    Number(r.gas) +
    Number(r.arreglos) +
    Number(r.servicios)
  );
}

function getInitials(nombre: string) {
  return nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState("");

  // ─── Stats queries ───────────────────────────────────────────────────────
  const { data: totalPropiedades = 0 } = useQuery({
    queryKey: ["stat-propiedades"],
    queryFn: async () => {
      const { count } = await supabase.from("propiedades").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalLocadores = 0 } = useQuery({
    queryKey: ["stat-locadores"],
    queryFn: async () => {
      const { count } = await supabase.from("locadores").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalLocatarios = 0 } = useQuery({
    queryKey: ["stat-locatarios"],
    queryFn: async () => {
      const { count } = await supabase.from("locatarios").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: recibosMes = 0 } = useQuery({
    queryKey: ["stat-recibos-mes"],
    queryFn: async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      const { count } = await supabase
        .from("recibos")
        .select("id", { count: "exact", head: true })
        .gte("fecha", from)
        .lte("fecha", to);
      return count ?? 0;
    },
  });

  // ─── Recent recibos ───────────────────────────────────────────────────────
  const { data: recibos = [], isLoading: loadingRecibos } = useQuery({
    queryKey: ["dashboard-recibos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recibos")
        .select("id, nro_serie, fecha, locatario_nombre, propiedad, monto, expensas, agua, luz, gas, arreglos, servicios, estado, fecha_entrega")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Recibo[];
    },
  });

  // ─── Update estado ────────────────────────────────────────────────────────
  const toggleEntregado = useMutation({
    mutationFn: async ({ id, estado, fechaEntrega }: { id: string; estado: string; fechaEntrega: string | null }) => {
      const { error } = await supabase.from("recibos").update({ estado, fecha_entrega: fechaEntrega }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-recibos"] });
      qc.invalidateQueries({ queryKey: ["recibos"] });
      qc.invalidateQueries({ queryKey: ["stat-recibos-mes"] });
      setEditingId(null);
    },
  });

  const handleToggleEntregado = (r: Recibo) => {
    if (r.estado === "Pendiente") {
      setEditingId(r.id);
      setEditFecha(new Date().toISOString().split("T")[0]);
    } else {
      toggleEntregado.mutate({ id: r.id, estado: "Pendiente", fechaEntrega: null });
    }
  };

  const confirmEntrega = (id: string) => {
    toggleEntregado.mutate({ id, estado: "Entregado", fechaEntrega: editFecha });
  };

  const stats = [
    { label: "Total Propiedades", value: totalPropiedades, icon: Building2, bg: "stat-blue", iconColor: "stat-blue-icon" },
    { label: "Total Locadores", value: totalLocadores, icon: UserCheck, bg: "stat-purple", iconColor: "stat-purple-icon" },
    { label: "Total Locatarios", value: totalLocatarios, icon: Users, bg: "stat-orange", iconColor: "stat-orange-icon" },
    { label: "Recibos (Mes)", value: recibosMes, icon: FileText, bg: "stat-green", iconColor: "stat-green-icon" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Resumen</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `hsl(var(--${stat.bg}))` }}
                >
                  <Icon className="w-5 h-5" style={{ color: `hsl(var(--${stat.iconColor}))` }} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recibos Generados */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">Recibos Recientes</h2>
            <p className="text-sm text-muted-foreground">Últimos recibos generados.</p>
          </div>
          <button
            onClick={() => onNavigate("recibos-generados")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Ver Todos
          </button>
        </div>

        {loadingRecibos ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locatario</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Propiedad</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ver</th>
                </tr>
              </thead>
              <tbody>
                {recibos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-sm text-muted-foreground text-center">
                      No hay recibos generados todavía.{" "}
                      <button
                        onClick={() => onNavigate("generar-cobro")}
                        className="text-primary underline"
                      >
                        Generar el primero
                      </button>
                    </td>
                  </tr>
                )}
                {recibos.map((r) => {
                  const fechaDisplay = (() => {
                    if (!r.fecha) return "—";
                    const parts = r.fecha.split("-");
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    return r.fecha;
                  })();
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-muted-foreground">{fechaDisplay}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                            {getInitials(r.locatario_nombre)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{r.locatario_nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{r.propiedad}</td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground hidden sm:table-cell">
                        ${getTotal(r).toLocaleString("es-AR")}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === r.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={editFecha}
                              onChange={(e) => setEditFecha(e.target.value)}
                              className="text-xs px-2 py-1 bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                            <button
                              onClick={() => confirmEntrega(r.id)}
                              className="p-1 rounded bg-[hsl(var(--badge-delivered-bg))] text-[hsl(var(--badge-delivered-text))]"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-secondary text-muted-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span
                              className="text-xs font-semibold px-3 py-1 rounded-full cursor-pointer select-none"
                              style={
                                r.estado === "Entregado"
                                  ? { background: "hsl(var(--badge-delivered-bg))", color: "hsl(var(--badge-delivered-text))" }
                                  : { background: "hsl(var(--badge-pending-bg))", color: "hsl(var(--badge-pending-text))" }
                              }
                              onClick={() => handleToggleEntregado(r)}
                              title="Click para cambiar estado"
                            >
                              {r.estado}
                            </span>
                            {r.estado === "Entregado" && r.fecha_entrega && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(() => {
                                  const p = r.fecha_entrega.split("-");
                                  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : r.fecha_entrega;
                                })()}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onNavigate("recibos-generados")}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
