import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, AlertTriangle, TrendingUp, FileX } from "lucide-react";

type LP = {
  id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  intervalo_ajuste_meses: number | null;
  indice_actualizacion: string | null;
  fecha_ultimo_ajuste: string | null;
  monto_base: number | string | null;
  propiedades: {
    direccion: string;
    locadores: { nombre: string } | null;
  } | null;
};

type Loc = {
  id: string;
  nombre: string;
  monto_base: number | string | null;
  locatario_propiedades: LP[];
};

type Hist = { locatario_id: string; monto: number; fecha_desde: string };

type Row = {
  key: string;
  locatario: string;
  locador: string;
  propiedad: string;
  estado: "vencido" | "vence" | "actualiza" | "sin-contrato";
  fecha: Date | null;
  fechaStr: string;
  indice: string;
  intervaloMeses: number | null;
  ultimoMonto: number;
  diasRestantes: number | null;
};

function fmtDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function buildRows(locatarios: Loc[], historial: Hist[]): Row[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Last registered amount per locatario from historial_precios (highest fecha_desde)
  const lastMonto = new Map<string, number>();
  for (const h of historial) {
    const prev = lastMonto.get(h.locatario_id);
    if (prev === undefined) lastMonto.set(h.locatario_id, Number(h.monto) || 0);
  }

  const rows: Row[] = [];

  locatarios.forEach((loc) => {
    const lps = loc.locatario_propiedades ?? [];

    if (lps.length === 0) return;

    lps.forEach((lp) => {
      const locadorNom = lp.propiedades?.locadores?.nombre ?? "—";
      const propNom = lp.propiedades?.direccion ?? "—";
      const ultimo = lastMonto.get(loc.id) ?? (Number(lp.monto_base) || 0);
      const indice = lp.indice_actualizacion ?? "—";
      const intervalo = lp.intervalo_ajuste_meses ?? null;

      // Sin datos base de contrato → no aplica para los próximos 20 días
      if (!lp.fecha_inicio || !lp.fecha_fin || !intervalo) return;

      // Próximo ajuste contractual
      const inicio = parseLocalDate(lp.fecha_inicio);
      let proximo = new Date(inicio);
      while (proximo <= today) {
        proximo.setMonth(proximo.getMonth() + intervalo);
      }
      if (lp.fecha_ultimo_ajuste) {
        const last = parseLocalDate(lp.fecha_ultimo_ajuste);
        last.setHours(0, 0, 0, 0);
        const periodoInicio = new Date(proximo);
        periodoInicio.setMonth(periodoInicio.getMonth() - intervalo);
        if (last >= periodoInicio) {
          proximo.setMonth(proximo.getMonth() + intervalo);
        }
      }

      const fin = parseLocalDate(lp.fecha_fin);
      fin.setHours(0, 0, 0, 0);
      const diasFin = Math.ceil((fin.getTime() - today.getTime()) / 86400000);
      const diasAj = Math.ceil((proximo.getTime() - today.getTime()) / 86400000);

      // Solo eventos dentro de los próximos 20 días
      const finProximo = diasFin >= 0 && diasFin <= 20;
      const ajProximo = diasAj >= 0 && diasAj <= 20;
      if (!finProximo && !ajProximo) return;

      let estado: Row["estado"];
      let fechaEv: Date;
      let dias: number;
      if (finProximo && (!ajProximo || diasFin <= diasAj)) {
        estado = "vence";
        fechaEv = fin;
        dias = diasFin;
      } else {
        estado = "actualiza";
        fechaEv = proximo;
        dias = diasAj;
      }

      rows.push({
        key: `lp-${lp.id}`,
        locatario: loc.nombre,
        locador: locadorNom,
        propiedad: propNom,
        estado,
        fecha: fechaEv,
        fechaStr: fmtDate(fechaEv),
        indice,
        intervaloMeses: intervalo,
        ultimoMonto: ultimo,
        diasRestantes: dias,
      });
    });
  });

  // Orden: locador → locatario → fecha
  rows.sort((a, b) => {
    const c1 = a.locador.localeCompare(b.locador, "es");
    if (c1 !== 0) return c1;
    const c2 = a.locatario.localeCompare(b.locatario, "es");
    if (c2 !== 0) return c2;
    const af = a.fecha ? a.fecha.getTime() : Infinity;
    const bf = b.fecha ? b.fecha.getTime() : Infinity;
    return af - bf;
  });
  return rows;
}

function badge(estado: Row["estado"]) {
  switch (estado) {
    case "vencido":
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"><AlertTriangle className="w-3 h-3" />Vencido</span>;
    case "vence":
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--badge-pending-bg))] text-[hsl(var(--badge-pending-text))]"><AlertTriangle className="w-3 h-3" />Por vencer</span>;
    case "actualiza":
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--stat-orange))] text-[hsl(var(--stat-orange-icon))]"><TrendingUp className="w-3 h-3" />Actualización</span>;
    case "sin-contrato":
      return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"><FileX className="w-3 h-3" />Sin contrato</span>;
  }
}

export default function Vencimientos() {
  const { data: locatarios = [], isLoading: l1 } = useQuery({
    queryKey: ["vencimientos-locatarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locatarios")
        .select(`
          id, nombre, monto_base,
          locatario_propiedades (
            id, fecha_inicio, fecha_fin,
            intervalo_ajuste_meses, indice_actualizacion,
            fecha_ultimo_ajuste, monto_base,
            propiedades (
              direccion,
              locadores ( nombre )
            )
          )
        `);
      if (error) throw error;
      return (data ?? []) as unknown as Loc[];
    },
  });

  const { data: historial = [], isLoading: l2 } = useQuery({
    queryKey: ["vencimientos-historial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historial_precios")
        .select("locatario_id, monto, fecha_desde")
        .order("fecha_desde", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Hist[];
    },
  });

  const rows = useMemo(() => buildRows(locatarios, historial), [locatarios, historial]);
  const isLoading = l1 || l2;

  const handlePrint = () => window.print();

  const today = new Date();
  const todayStr = fmtDate(today);


  return (
    <>
      {/* Print view */}
      {createPortal(
        <div className="listing-print">
          <div className="lp-page">
            <div className="lp-header">
              <img src="/logo.png" alt="Logo" className="lp-logo" />
              <div className="lp-title">
                <h1>VENCIMIENTOS Y ACTUALIZACIONES</h1>
                <p>Próximos 20 días — Generado el {todayStr}</p>
              </div>
            </div>

            {rows.length > 0 && (
              <table className="lp-table">
                <thead>
                  <tr>
                    <th>Locador</th>
                    <th>Locatario</th>
                    <th>Propiedad</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Índice</th>
                    <th>Cada (meses)</th>
                    <th style={{ textAlign: "right" }}>Último monto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td>{r.locador}</td>
                      <td>{r.locatario}</td>
                      <td>{r.propiedad}</td>
                      <td>{r.estado === "vence" ? "Por vencer" : "Actualización"}</td>
                      <td>{r.fechaStr}</td>
                      <td>{r.indice}</td>
                      <td>{r.intervaloMeses ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(r.ultimoMonto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="lp-footer">Negocios Inmobiliarios — Portal de Gestión</p>
          </div>
        </div>,
        document.body
      )}

      <div className="p-6 md:p-8 no-print">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vencimientos / Actualización</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Contratos con vencimiento o actualización en los próximos 20 días.
              </p>
            </div>
            <button
              onClick={handlePrint}
              disabled={isLoading || rows.length === 0}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Sin vencimientos ni actualizaciones en los próximos 20 días</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Locador</th>
                      <th className="text-left px-4 py-3">Locatario</th>
                      <th className="text-left px-4 py-3">Propiedad</th>
                      <th className="text-left px-4 py-3">Estado</th>
                      <th className="text-left px-4 py-3">Fecha</th>
                      <th className="text-left px-4 py-3">Índice</th>
                      <th className="text-center px-4 py-3">Cada (meses)</th>
                      <th className="text-right px-4 py-3">Último monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.key} className="hover:bg-secondary/30">
                        <td className="px-4 py-3 font-medium text-foreground">{r.locador}</td>
                        <td className="px-4 py-3 text-foreground">{r.locatario}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.propiedad}</td>
                        <td className="px-4 py-3">{badge(r.estado)}</td>
                        <td className="px-4 py-3 text-foreground">
                          {r.fechaStr}
                          {r.diasRestantes !== null && (
                            <span className="block text-xs text-muted-foreground">
                              En {r.diasRestantes} días
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.indice}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{r.intervaloMeses ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{fmtMoney(r.ultimoMonto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
