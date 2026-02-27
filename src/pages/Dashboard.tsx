import { useState } from "react";
import { Building2, Users, UserCheck, FileText, Eye, Check, X } from "lucide-react";

type Recibo = {
  id: number;
  fecha: string;
  locatario: string;
  propiedad: string;
  monto: number;
  expensas: number;
  estado: string;
  fechaEntrega: string;
  iniciales: string;
};

import { recibos as initialRecibos } from "@/lib/mockData";

const stats = [
  { label: "Total Propiedades", value: "124", change: "+12%", icon: Building2, bg: "stat-blue", iconColor: "stat-blue-icon" },
  { label: "Total Locadores", value: "42", change: "+5%", icon: UserCheck, bg: "stat-purple", iconColor: "stat-purple-icon" },
  { label: "Total Locatarios", value: "156", change: "+8%", icon: Users, bg: "stat-orange", iconColor: "stat-orange-icon" },
  { label: "Recibos (Mes)", value: "89", change: "+15%", icon: FileText, bg: "stat-green", iconColor: "stat-green-icon" },
];

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [recibos, setRecibos] = useState<Recibo[]>(initialRecibos);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFecha, setEditFecha] = useState("");

  const handleToggleEntregado = (r: Recibo) => {
    if (r.estado === "Pendiente") {
      setEditingId(r.id);
      setEditFecha(new Date().toISOString().split("T")[0]);
    } else {
      setRecibos((prev) =>
        prev.map((x) => x.id === r.id ? { ...x, estado: "Pendiente", fechaEntrega: "" } : x)
      );
    }
  };

  const confirmEntrega = (id: number) => {
    const formatted = new Date(editFecha + "T00:00:00").toLocaleDateString("es-AR", {
      day: "2-digit", month: "short", year: "numeric",
    });
    setRecibos((prev) =>
      prev.map((x) => x.id === id ? { ...x, estado: "Entregado", fechaEntrega: formatted } : x)
    );
    setEditingId(null);
  };

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
                <span className="text-xs font-semibold text-[hsl(var(--stat-green-icon))] bg-[hsl(var(--stat-green))] px-2 py-0.5 rounded-full">
                  {stat.change}
                </span>
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
            <h2 className="font-bold text-foreground">Recibos Generados</h2>
            <p className="text-sm text-muted-foreground">Últimas transacciones de alquiler.</p>
          </div>
          <button
            onClick={() => onNavigate("recibos-generados")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Ver Todos
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locatario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Propiedad</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Monto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acción</th>
              </tr>
            </thead>
            <tbody>
              {recibos.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-foreground">{r.fecha}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                        {r.iniciales}
                      </div>
                      <span className="text-sm font-medium text-foreground">{r.locatario}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{r.propiedad}</td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground hidden sm:table-cell">
                    ${r.monto.toLocaleString("es-AR")}
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
                        <button onClick={() => confirmEntrega(r.id)} className="p-1 rounded bg-[hsl(var(--badge-delivered-bg))] text-[hsl(var(--badge-delivered-text))]">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded bg-secondary text-muted-foreground">
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
                        {r.estado === "Entregado" && r.fechaEntrega && (
                          <p className="text-xs text-muted-foreground mt-0.5">{r.fechaEntrega}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
