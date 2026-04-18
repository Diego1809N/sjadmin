import { X, Bell, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

type Notification = {
  id: string;
  type: "ajuste" | "vencimiento";
  locatario: string;
  propiedad: string;
  fecha: string;
  diasRestantes: number;
  indice?: string;
};

function buildNotifications(locatarios: {
  id: string;
  nombre: string;
  locatario_propiedades: {
    id: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    intervalo_ajuste_meses: number | null;
    indice_actualizacion: string | null;
    fecha_ultimo_ajuste: string | null;
    propiedades: { direccion: string } | null;
  }[];
}[]): Notification[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const notifications: Notification[] = [];

  locatarios.forEach((loc) => {
    loc.locatario_propiedades.forEach((lp) => {
      const propNombre = lp.propiedades?.direccion ?? "Propiedad";

      // --- Próximo ajuste ---
      // No mostrar alerta de ajuste si el contrato ya venció (sin renovar)
      const contratoVencido = lp.fecha_fin
        ? (() => { const f = new Date(lp.fecha_fin); f.setHours(0,0,0,0); return f < today; })()
        : false;

      if (lp.fecha_inicio && lp.intervalo_ajuste_meses && !contratoVencido) {
        const inicio = new Date(lp.fecha_inicio);
        let proximoAjuste = new Date(inicio);
        // Avanzar hasta que la fecha de ajuste sea posterior a hoy (próxima fecha contractual)
        while (proximoAjuste <= today) {
          proximoAjuste = new Date(proximoAjuste);
          proximoAjuste.setMonth(proximoAjuste.getMonth() + lp.intervalo_ajuste_meses);
        }
        // Si el último ajuste se hizo dentro del período actual (entre la fecha contractual anterior y la próxima),
        // significa que ya fue aplicado de forma anticipada o puntual: saltar al siguiente período.
        if (lp.fecha_ultimo_ajuste) {
          const lastAdj = new Date(lp.fecha_ultimo_ajuste);
          lastAdj.setHours(0, 0, 0, 0);
          const periodoInicio = new Date(proximoAjuste);
          periodoInicio.setMonth(periodoInicio.getMonth() - lp.intervalo_ajuste_meses);
          if (lastAdj >= periodoInicio) {
            // Ya ajustado para este período → mostrar el siguiente vencimiento contractual
            proximoAjuste.setMonth(proximoAjuste.getMonth() + lp.intervalo_ajuste_meses);
          }
        }
        const diasAjuste = Math.ceil((proximoAjuste.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diasAjuste <= 30) {
          notifications.push({
            id: `ajuste-${lp.id}`,
            type: "ajuste",
            locatario: loc.nombre,
            propiedad: propNombre,
            fecha: proximoAjuste.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
            diasRestantes: diasAjuste,
            indice: lp.indice_actualizacion ?? "ICL",
          });
        }
      }

      // --- Vencimiento de contrato ---
      if (lp.fecha_fin) {
        const fin = new Date(lp.fecha_fin);
        fin.setHours(0, 0, 0, 0);
        const diasFin = Math.ceil((fin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diasFin >= 0 && diasFin <= 30) {
          notifications.push({
            id: `venc-${lp.id}`,
            type: "vencimiento",
            locatario: loc.nombre,
            propiedad: propNombre,
            fecha: fin.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
            diasRestantes: diasFin,
          });
        }
      }
    });
  });

  // Sort: fewer days first
  notifications.sort((a, b) => a.diasRestantes - b.diasRestantes);
  return notifications;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { data: locatarios = [], isLoading } = useQuery({
    queryKey: ["notif-locatarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locatarios")
        .select(`
          id, nombre,
          locatario_propiedades (
            id, fecha_inicio, fecha_fin,
            intervalo_ajuste_meses, indice_actualizacion,
            fecha_ultimo_ajuste,
            propiedades ( direccion )
          )
        `);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  if (!open) return null;

  const notifications = buildNotifications(locatarios as Parameters<typeof buildNotifications>[0]);

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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
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
