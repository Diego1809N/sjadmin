import { Building2, Users, UserCheck, FileText, Eye } from "lucide-react";
import { recibos } from "@/lib/mockData";

const stats = [
  { label: "Total Propiedades", value: "124", change: "+12%", icon: Building2, bg: "stat-blue", iconColor: "stat-blue-icon" },
  { label: "Total Locadores", value: "42", change: "+5%", icon: UserCheck, bg: "stat-purple", iconColor: "stat-purple-icon" },
  { label: "Total Locatarios", value: "156", change: "+8%", icon: Users, bg: "stat-orange", iconColor: "stat-orange-icon" },
  { label: "Recibos (Mes)", value: "89", change: "+15%", icon: FileText, bg: "stat-green", iconColor: "stat-green-icon" },
];

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resumen</h1>
        </div>
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

      {/* Recent Receipts */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">Últimos 5 Recibos Generados</h2>
            <p className="text-sm text-muted-foreground">Lista de las transacciones de alquiler más recientes.</p>
          </div>
          <button
            onClick={() => onNavigate("generar-cobro")}
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
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
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={
                        r.estado === "Entregado"
                          ? { background: "hsl(var(--badge-delivered-bg))", color: "hsl(var(--badge-delivered-text))" }
                          : { background: "hsl(var(--badge-pending-bg))", color: "hsl(var(--badge-pending-text))" }
                      }
                    >
                      {r.estado}
                    </span>
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
