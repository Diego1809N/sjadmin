import { X, Bell, TrendingUp, AlertTriangle } from "lucide-react";
import { locatarios } from "@/lib/mockData";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

function getNotifications() {
  const today = new Date();
  const notifications: { id: number; type: "ajuste" | "vencimiento"; locatario: string; propiedad: string; fecha: string; diasRestantes: number; indice?: string }[] = [];

  locatarios.forEach((loc) => {
    // Check próximo ajuste
    const inicio = new Date(loc.inicioAlquiler);
    let proximoAjuste = new Date(inicio);
    while (proximoAjuste <= today) {
      proximoAjuste.setMonth(proximoAjuste.getMonth() + loc.ajusteMeses);
    }
    const diasAjuste = Math.ceil((proximoAjuste.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diasAjuste <= 30) {
      notifications.push({
        id: loc.id * 100,
        type: "ajuste",
        locatario: loc.nombre,
        propiedad: `Prop. ${loc.propiedadIds.join(", ")}`,
        fecha: proximoAjuste.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
        diasRestantes: diasAjuste,
        indice: loc.indiceAjuste,
      });
    }

    // Check vencimiento de contrato
    const fin = new Date(loc.finAlquiler);
    const diasFin = Math.ceil((fin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diasFin <= 30 && diasFin >= 0) {
      notifications.push({
        id: loc.id * 100 + 1,
        type: "vencimiento",
        locatario: loc.nombre,
        propiedad: `Prop. ${loc.propiedadIds.join(", ")}`,
        fecha: fin.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
        diasRestantes: diasFin,
      });
    }
  });

  // Add some demo notifications since mock data dates may be past
  notifications.push(
    { id: 9901, type: "ajuste", locatario: "Laura Pérez", propiedad: "Dpto 4B, Sunset Heights", fecha: "15 Mar 2026", diasRestantes: 16, indice: "IPC" },
    { id: 9902, type: "ajuste", locatario: "Sofía Torres", propiedad: "Villa 7, Green Valley", fecha: "20 Mar 2026", diasRestantes: 21, indice: "IPC" },
    { id: 9903, type: "vencimiento", locatario: "Martín Castro", propiedad: "Dpto 101, City Center", fecha: "28 Mar 2026", diasRestantes: 29 },
  );

  return notifications;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const notifications = getNotifications();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-16 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Notificaciones</span>
            {notifications.length > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin notificaciones pendientes
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="px-4 py-3 hover:bg-secondary/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.type === "ajuste" ? "bg-[hsl(var(--stat-orange))]" : "bg-[hsl(var(--badge-pending-bg))]"
                  }`}>
                    {n.type === "ajuste"
                      ? <TrendingUp className="w-4 h-4" style={{ color: "hsl(var(--stat-orange-icon))" }} />
                      : <AlertTriangle className="w-4 h-4" style={{ color: "hsl(var(--badge-pending-text))" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{n.locatario}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.propiedad}</p>
                    <p className="text-xs font-medium mt-1" style={{ color: n.diasRestantes <= 7 ? "hsl(var(--destructive))" : "hsl(var(--badge-pending-text))" }}>
                      {n.type === "ajuste"
                        ? `Ajuste ${n.indice} en ${n.diasRestantes} días`
                        : `Vence contrato en ${n.diasRestantes} días`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">{n.fecha}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
