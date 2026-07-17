import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Pencil, X, Trash2, Bell, Search, Loader2, Printer, Clock, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { enqueueChange, type PropFormPayload } from "@/lib/aprobaciones";


function exportToCSV(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type Locatario = {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
};

type Propiedad = {
  id: string;
  direccion: string;
  locador_id: string | null;
  locadores?: { nombre: string } | null;
};

type LocatarioProp = {
  id: string;
  locatario_id: string;
  propiedad_id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  monto_base: number;
  intervalo_ajuste_meses: number | null;
  indice_actualizacion: string | null;
  notas: string | null;
  fecha_ultimo_ajuste: string | null;
};

type LocatarioConProps = Locatario & {
  locatario_propiedades: (LocatarioProp & { propiedades?: Propiedad | null })[];
};

const INDICES = ["IPC", "ICL", "CVS", "IRM", "Acuerdo de partes"];

type PropForm = {
  propiedad_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto_base: number;
  intervalo_ajuste_meses: number;
  indice_actualizacion: string;
  notas: string;
  pending_ajustes: Record<number, number>; // periodo idx → monto nuevo
};

const emptyForm = {
  nombre: "", dni: "", telefono: "", email: "", notas: "",
};

const emptyPropForm: PropForm = {
  propiedad_id: "",
  fecha_inicio: "",
  fecha_fin: "",
  monto_base: 0,
  intervalo_ajuste_meses: 3,
  indice_actualizacion: "ICL",
  notas: "",
  pending_ajustes: {},
};

function fmtDDMMYYYY(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Parsea "YYYY-MM-DD" como fecha LOCAL (evita el desfase de zona horaria que hace `new Date("2024-08-08")` retroceder un día).
function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(s);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getPeriodos(fechaInicio: string, fechaFin: string | null, intervalo: number): Date[] {
  if (!fechaInicio || !intervalo) return [];
  const start = parseLocalDate(fechaInicio);
  if (!start) return [];
  let totalMonths = 12;
  const end = parseLocalDate(fechaFin);
  if (end) {
    totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }
  const n = Math.max(1, Math.ceil(totalMonths / intervalo));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i * intervalo);
    return d;
  });
}

// Índice del período "actual" según la fecha de hoy (el último período cuya fecha ≤ hoy).
function getCurrentPeriodoIdx(periodos: Date[]): number {
  if (periodos.length === 0) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let idx = 0;
  for (let i = 0; i < periodos.length; i++) {
    const p = new Date(periodos[i]); p.setHours(0, 0, 0, 0);
    if (p.getTime() <= today.getTime()) idx = i;
    else break;
  }
  return idx;
}

function getPeriodoIdxByDate(periodos: Date[], fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const iso = toLocalISO(parseLocalDate(fecha) ?? new Date(fecha));
  const idx = periodos.findIndex((p) => toLocalISO(p) === iso);
  return idx >= 0 ? idx : null;
}

function getRowStatus(l: LocatarioConProps): "sin-fechas" | "vence" | "actualiza" | "ok" {
  if (l.locatario_propiedades.length === 0) return "sin-fechas";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in60 = new Date(today); in60.setDate(in60.getDate() + 60);
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  let status: "sin-fechas" | "vence" | "actualiza" | "ok" = "ok";
  let anyWithDates = false;
  for (const lp of l.locatario_propiedades) {
    if (!lp.fecha_inicio && !lp.fecha_fin) continue;
    anyWithDates = true;
    if (lp.fecha_fin) {
      const fin = new Date(lp.fecha_fin); fin.setHours(0, 0, 0, 0);
      if (fin <= in60) { status = "vence"; }
    }
    if (status !== "vence" && lp.fecha_inicio && lp.intervalo_ajuste_meses) {
      const inicio = new Date(lp.fecha_inicio);
      let next = new Date(inicio);
      while (next <= today) next.setMonth(next.getMonth() + lp.intervalo_ajuste_meses);
      if (lp.fecha_ultimo_ajuste) {
        const lastAdj = new Date(lp.fecha_ultimo_ajuste); lastAdj.setHours(0, 0, 0, 0);
        const periodoInicio = new Date(next); periodoInicio.setMonth(periodoInicio.getMonth() - lp.intervalo_ajuste_meses);
        if (lastAdj >= periodoInicio) next.setMonth(next.getMonth() + lp.intervalo_ajuste_meses);
      }
      if (next <= in30) status = "actualiza";
    }
  }
  if (!anyWithDates) return "sin-fechas";
  return status;
}

function getUpcomingAdjustments(locatarios: LocatarioConProps[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneMonthAhead = new Date(today);
  oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
  return locatarios.filter((l) => {
    return l.locatario_propiedades.some((lp) => {
      if (!lp.fecha_inicio || !lp.intervalo_ajuste_meses) return false;

      // Si el contrato ya venció, no mostrar alerta de ajuste hasta que se renueve
      if (lp.fecha_fin) {
        const fin = new Date(lp.fecha_fin);
        fin.setHours(0, 0, 0, 0);
        if (fin < today) return false;
      }

      const inicio = new Date(lp.fecha_inicio);
      let next = new Date(inicio);
      while (next <= today) {
        next.setMonth(next.getMonth() + lp.intervalo_ajuste_meses);
      }
      // Si el último ajuste se hizo dentro del período actual, saltar al siguiente
      if (lp.fecha_ultimo_ajuste) {
        const lastAdj = new Date(lp.fecha_ultimo_ajuste);
        lastAdj.setHours(0, 0, 0, 0);
        const periodoInicio = new Date(next);
        periodoInicio.setMonth(periodoInicio.getMonth() - lp.intervalo_ajuste_meses);
        if (lastAdj >= periodoInicio) {
          next.setMonth(next.getMonth() + lp.intervalo_ajuste_meses);
        }
      }
      return next <= oneMonthAhead;
    });
  });
}

export default function Locatarios() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<LocatarioConProps | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [propForms, setPropForms] = useState<PropForm[]>([]);
  const [removedLpIds, setRemovedLpIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: locatarios = [], isLoading } = useQuery({
    queryKey: ["locatarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locatarios")
        .select(`
          id, nombre, dni, telefono, email, notas,
          locatario_propiedades (
            id, locatario_id, propiedad_id,
            fecha_inicio, fecha_fin, monto_base,
            intervalo_ajuste_meses, indice_actualizacion, notas,
            fecha_ultimo_ajuste,
            propiedades ( id, direccion, locador_id, locadores ( nombre ) )
          )
        `)
        .order("nombre");
      if (error) throw error;
      return data as LocatarioConProps[];
    },
  });

  const { data: propiedades = [] } = useQuery({
    queryKey: ["propiedades-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propiedades")
        .select("id, direccion, locador_id, locadores ( nombre )")
        .order("direccion");
      if (error) throw error;
      return data as Propiedad[];
    },
  });

  const { data: historial = [] } = useQuery({
    queryKey: ["historial-precios", editing?.id],
    enabled: !!editing?.id && !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historial_precios")
        .select("id, locatario_id, propiedad_id, monto, fecha_desde, fecha_hasta, created_at")
        .eq("locatario_id", editing!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ─── Cambios pendientes por locatario (badge "Cambio pendiente") ─────────
  const { data: pendingByLoc = {} } = useQuery({
    queryKey: ["cambios-pendientes-locatarios"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("cambios_pendientes")
        .select("id, tipo, entidad_id")
        .eq("estado", "pendiente")
        .eq("entidad_tabla", "locatarios");
      const map: Record<string, { count: number; tipos: string[] }> = {};
      for (const r of (data ?? []) as { id: string; tipo: string; entidad_id: string }[]) {
        if (!r.entidad_id) continue;
        if (!map[r.entidad_id]) map[r.entidad_id] = { count: 0, tipos: [] };
        map[r.entidad_id].count += 1;
        map[r.entidad_id].tipos.push(r.tipo);
      }
      return map;
    },
    refetchInterval: 15000,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const saveLocatario = useMutation({
    mutationFn: async () => {
      // Alta de un locatario nuevo: se aplica directo (no requiere aprobación)
      if (isNew) {
        const { data, error } = await supabase
          .from("locatarios")
          .insert({
            nombre: form.nombre,
            dni: form.dni || null,
            telefono: form.telefono || null,
            email: form.email || null,
            notas: form.notas || null,
            monto_base: 0,
          })
          .select("id")
          .single();
        if (error) throw error;
        const locId = data.id;

        // Insertar propiedades iniciales directo (creación inicial)
        for (const pf of propForms) {
          if (!pf.propiedad_id) continue;
          const { error: err } = await supabase.from("locatario_propiedades").insert({
            locatario_id: locId,
            propiedad_id: pf.propiedad_id,
            fecha_inicio: pf.fecha_inicio || null,
            fecha_fin: pf.fecha_fin || null,
            monto_base: Number(pf.monto_base) || 0,
            intervalo_ajuste_meses: pf.intervalo_ajuste_meses || null,
            indice_actualizacion: pf.indice_actualizacion || null,
            notas: pf.notas || null,
          });
          if (err) throw err;
        }
        return { pending: false as const };
      }

      // Edición: se envía a aprobación del superadmin
      if (!editing?.id) return { pending: false as const };

      const payloadPropForms: PropFormPayload[] = propForms.map((pf) => {
        const existingLp = editing.locatario_propiedades.find((lp) => lp.propiedad_id === pf.propiedad_id);
        return {
          id: existingLp?.id,
          propiedad_id: pf.propiedad_id,
          fecha_inicio: pf.fecha_inicio,
          fecha_fin: pf.fecha_fin,
          monto_base: pf.monto_base,
          intervalo_ajuste_meses: pf.intervalo_ajuste_meses,
          indice_actualizacion: pf.indice_actualizacion,
          notas: pf.notas,
          pending_ajustes: pf.pending_ajustes,
        };
      });

      await enqueueChange({
        tipo: "editar_locatario",
        entidad_tabla: "locatarios",
        entidad_id: editing.id,
        descripcion: `Editar datos de ${form.nombre}`,
        payload: {
          locatario_id: editing.id,
          form,
          propForms: payloadPropForms,
          removedLpIds,
        },
      });
      return { pending: true as const };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["locatarios"] });
      qc.invalidateQueries({ queryKey: ["propiedades"] });
      qc.invalidateQueries({ queryKey: ["historial-precios"] });
      qc.invalidateQueries({ queryKey: ["cambios-pendientes-locatarios"] });
      if (res?.pending) {
        toast.success("Cambio enviado a aprobación del superadmin");
      } else {
        toast.success("Guardado");
      }
      setEditing(null);
    },
    onError: (e: Error) => toast.error("Error al guardar: " + e.message),
  });

  const deleteLocatario = useMutation({
    mutationFn: async (id: string) => {
      if (!editing) return;
      await enqueueChange({
        tipo: "eliminar_locatario",
        entidad_tabla: "locatarios",
        entidad_id: id,
        descripcion: `Eliminar locatario: ${editing.nombre}`,
        payload: { locatario_id: id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cambios-pendientes-locatarios"] });
      toast.success("Eliminación enviada a aprobación del superadmin");
      setEditing(null);
    },
    onError: (e: Error) => toast.error("Error: " + e.message),
  });

  const renovarContrato = useMutation({
    mutationFn: async () => {
      if (!editing?.id) return;
      await enqueueChange({
        tipo: "renovar_contrato",
        entidad_tabla: "locatarios",
        entidad_id: editing.id,
        descripcion: `Renovar contrato de ${editing.nombre}`,
        payload: { locatario_id: editing.id, locatario_nombre: editing.nombre },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cambios-pendientes-locatarios"] });
      toast.success("Renovación enviada a aprobación. Una vez aprobada, podrás completar los datos nuevos.");
      setEditing(null);
    },
    onError: (e: Error) => toast.error("Error: " + e.message),
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const upcoming = getUpcomingAdjustments(locatarios);

  const filtered = useMemo(() => {
    if (!search.trim()) return locatarios;
    const q = search.toLowerCase();
    return locatarios.filter(
      (l) => l.nombre.toLowerCase().includes(q) || (l.dni ?? "").includes(q) || (l.email ?? "").toLowerCase().includes(q)
    );
  }, [locatarios, search]);

  const openEdit = async (l: LocatarioConProps) => {
    setEditing(l);
    setIsNew(false);
    setForm({ nombre: l.nombre, dni: l.dni ?? "", telefono: l.telefono ?? "", email: l.email ?? "", notas: l.notas ?? "" });

    // Precargar pending_ajustes desde historial (períodos pasados) + monto actual.
    const { data: hist } = await supabase
      .from("historial_precios")
      .select("propiedad_id, monto, fecha_desde, created_at")
      .eq("locatario_id", l.id)
      .order("created_at", { ascending: true });

    setPropForms(l.locatario_propiedades.map((lp) => {
      const periodos = getPeriodos(lp.fecha_inicio ?? "", lp.fecha_fin ?? null, lp.intervalo_ajuste_meses ?? 3);
      const currentIdx = getCurrentPeriodoIdx(periodos);
      const activeIdx = getPeriodoIdxByDate(periodos, lp.fecha_ultimo_ajuste) ?? currentIdx;
      const histProp = (hist ?? []).filter((h: any) => h.propiedad_id === lp.propiedad_id);
      const pending: Record<number, number> = {};
      // Historial por fecha de período: evita que un monto futuro se muestre en el período vigente.
      for (const h of histProp) {
        const hIdx = getPeriodoIdxByDate(periodos, h.fecha_desde);
        if (hIdx !== null) pending[hIdx] = Number(h.monto);
      }
      // El monto base activo va en el período donde se guardó el último ajuste, aunque sea futuro.
      pending[activeIdx] = Number(lp.monto_base);
      return {
        propiedad_id: lp.propiedad_id,
        fecha_inicio: lp.fecha_inicio ?? "",
        fecha_fin: lp.fecha_fin ?? "",
        monto_base: Number(lp.monto_base),
        intervalo_ajuste_meses: lp.intervalo_ajuste_meses ?? 3,
        indice_actualizacion: lp.indice_actualizacion ?? "ICL",
        notas: lp.notas ?? "",
        pending_ajustes: pending,
      };
    }));
    setRemovedLpIds([]);
  };

  const openNew = () => {
    setEditing({ id: "", nombre: "", dni: null, telefono: null, email: null, notas: null, locatario_propiedades: [] });
    setIsNew(true);
    setForm(emptyForm);
    setPropForms([]);
    setRemovedLpIds([]);
  };

  const addPropForm = () => setPropForms((prev) => [...prev, { ...emptyPropForm }]);

  const removePropForm = (index: number) => {
    const lp = editing?.locatario_propiedades[index];
    if (lp) setRemovedLpIds((prev) => [...prev, lp.id]);
    setPropForms((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePropForm = (index: number, field: keyof PropForm, value: string | number) => {
    setPropForms((prev) => prev.map((pf, i) => i === index ? { ...pf, [field]: value } : pf));
  };

  const getPropNames = (l: LocatarioConProps) =>
    l.locatario_propiedades.map((lp) => lp.propiedades?.direccion ?? "").filter(Boolean).join(", ");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="p-6 space-y-6 print:hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Locatarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Inquilinos registrados en el sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const originalTitle = document.title;
              document.title = "Locatarios";
              setTimeout(() => { window.print(); document.title = originalTitle; }, 100);
            }}
            className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Nuevo Locatario
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar locatario, DNI, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
      </div>

      {/* Upcoming adjustment alerts */}
      {upcoming.length > 0 && (
        <div className="bg-[hsl(var(--badge-pending-bg))] border border-[hsl(var(--badge-pending-text))]/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--badge-pending-text))]">
            <Bell className="w-4 h-4" />
            Próximos ajustes de alquiler (en menos de 1 mes)
          </div>
          {upcoming.map((l) => {
            const lp = l.locatario_propiedades[0];
            return (
              <p key={l.id} className="text-xs text-[hsl(var(--badge-pending-text))] pl-6">
                {l.nombre} — c/{lp?.intervalo_ajuste_meses ?? 3}m por {lp?.indice_actualizacion ?? "ICL"}, base ${Number(lp?.monto_base ?? 0).toLocaleString("es-AR")}
              </p>
            );
          })}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">DNI</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Propiedades</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const st = getRowStatus(l);
                const stStyles: Record<string, { bg: string; border: string; badgeBg: string; badgeText: string; label: string }> = {
                  "vence":     { bg: "bg-red-500/5",    border: "border-l-4 border-l-red-500",    badgeBg: "bg-red-500/15",    badgeText: "text-red-600",    label: "Vence contrato" },
                  "actualiza": { bg: "bg-amber-500/5",  border: "border-l-4 border-l-amber-500",  badgeBg: "bg-amber-500/15",  badgeText: "text-amber-700",  label: "Actualiza" },
                  "sin-fechas":{ bg: "bg-slate-500/5",  border: "border-l-4 border-l-slate-400",  badgeBg: "bg-slate-500/15",  badgeText: "text-slate-600",  label: "Sin contrato" },
                  "ok":        { bg: "",                 border: "",                                badgeBg: "",                  badgeText: "",                label: "" },
                };
                const s = stStyles[st];
                return (
                <tr key={l.id} className={`border-b border-border last:border-0 hover:bg-secondary/50 transition-colors ${s.bg} ${s.border}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "hsl(var(--stat-orange))", color: "hsl(var(--stat-orange-icon))" }}
                      >
                        {l.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                          {l.nombre}
                          {s.label && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${s.badgeBg} ${s.badgeText}`}>
                              {s.label}
                            </span>
                          )}
                          {pendingByLoc[l.id] && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-500/15 text-amber-700 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Cambio pendiente
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground">{l.email ?? ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{l.dni ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{l.telefono ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell max-w-xs truncate">{getPropNames(l)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-sm text-muted-foreground text-center">No hay locatarios registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / New Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">{isNew ? "Nuevo Locatario" : "Editar Locatario"}</h2>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Personal data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nombre y Apellido *</label>
                  <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">DNI</label>
                  <input value={form.dni} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="00.000.000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="351-000-0000" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="email@ejemplo.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</label>
                  <input value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Observaciones opcionales" />
                </div>
              </div>

              {/* Property contracts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Propiedades y Contratos</p>
                  <button
                    type="button"
                    onClick={addPropForm}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    + Agregar propiedad
                  </button>
                </div>

                {propForms.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Sin propiedades asignadas. Hacé click en "+ Agregar propiedad".</p>
                )}

                <div className="space-y-4">
                  {propForms.map((pf, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-4 bg-secondary/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Propiedad {idx + 1}</p>
                        <button type="button" onClick={() => removePropForm(idx)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Propiedad *</label>
                        <select
                          value={pf.propiedad_id}
                          onChange={(e) => updatePropForm(idx, "propiedad_id", e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Seleccionar propiedad...</option>
                          {propiedades.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.direccion}{p.locadores ? ` (${p.locadores.nombre})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Inicio de contrato</label>
                          <input type="date" value={pf.fecha_inicio} onChange={(e) => updatePropForm(idx, "fecha_inicio", e.target.value)} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Fin de contrato</label>
                          <input type="date" value={pf.fecha_fin} onChange={(e) => updatePropForm(idx, "fecha_fin", e.target.value)} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Monto inicial (ARS)</label>
                          <input type="number" value={pf.monto_base || ""} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => {
                            const v = e.target.value === "" ? 0 : Number(e.target.value);
                            setPropForms((prev) => prev.map((p, i) => {
                              if (i !== idx) return p;
                              const periodos = getPeriodos(p.fecha_inicio, p.fecha_fin || null, p.intervalo_ajuste_meses);
                              const cIdx = getCurrentPeriodoIdx(periodos);
                              return { ...p, monto_base: v, pending_ajustes: { ...p.pending_ajustes, [cIdx]: v } };
                            }));
                          }} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="85000" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Ajuste cada (meses)</label>
                          <input type="number" min={1} max={24} value={pf.intervalo_ajuste_meses || ""} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => updatePropForm(idx, "intervalo_ajuste_meses", e.target.value === "" ? 0 : Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-muted-foreground mb-1">Índice de ajuste</label>
                          <select value={pf.indice_actualizacion} onChange={(e) => updatePropForm(idx, "indice_actualizacion", e.target.value)} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                            {INDICES.map((i) => <option key={i}>{i}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-muted-foreground mb-1">Notas del contrato</label>
                          <input value={pf.notas} onChange={(e) => updatePropForm(idx, "notas", e.target.value)} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Cláusulas especiales, etc." />
                        </div>
                      </div>

                      {/* Grilla de períodos de ajuste — todos editables */}
                      {(() => {
                        const periodos = getPeriodos(pf.fecha_inicio, pf.fecha_fin || null, pf.intervalo_ajuste_meses);
                        if (periodos.length === 0) {
                          return <p className="text-xs text-muted-foreground italic">Completá fecha de inicio, fin e intervalo para ver los períodos de ajuste.</p>;
                        }
                        const currentIdx = getCurrentPeriodoIdx(periodos);
                        return (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Plan de ajustes ({periodos.length} períodos)</p>
                            <p className="text-[11px] text-muted-foreground mb-2">El último casillero completado será el monto utilizado para generar los recibos.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {periodos.map((fecha, pIdx) => {
                                const isPast = pIdx < currentIdx;
                                const isCurrent = pIdx === currentIdx;
                                const isFuture = pIdx > currentIdx;
                                let label = "";
                                let bg = "bg-card";
                                if (isPast) { label = "Anterior"; bg = "bg-secondary/60"; }
                                else if (isCurrent) { label = pIdx === 0 ? "Inicial / Actual" : "Actual"; bg = "bg-primary/10 border-primary/40"; }
                                else if (isFuture) { label = pIdx === currentIdx + 1 ? "Próximo ajuste" : "Futuro"; }
                                const valor = pf.pending_ajustes?.[pIdx];
                                return (
                                  <div key={pIdx} className={`border border-border rounded-lg p-2 ${bg}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Período {pIdx + 1}</span>
                                      <span className="text-[10px] text-muted-foreground">{label}</span>
                                    </div>
                                    <p className="text-[11px] text-foreground mb-1">{fmtDDMMYYYY(fecha)}</p>
                                    <input
                                      type="number"
                                      value={valor === undefined || valor === 0 ? "" : valor}
                                      onWheel={(e) => e.currentTarget.blur()}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? 0 : Number(e.target.value);
                                        setPropForms((prev) => prev.map((p, i) => {
                                          if (i !== idx) return p;
                                          const next = { ...p, pending_ajustes: { ...p.pending_ajustes, [pIdx]: v } };
                                          if (pIdx === currentIdx) next.monto_base = v;
                                          return next;
                                        }));
                                      }}
                                      placeholder="Monto"
                                      className="w-full px-2 py-1 text-xs bg-card border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
              </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
              {!isNew && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleteLocatario.isPending}
                    className="flex items-center gap-1.5 text-sm text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />Eliminar
                  </button>
                  {(() => {
                    // Mostrar "Renovar" si algún contrato está vencido o vence en ≤ 30 días
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
                    const puedeRenovar = editing?.locatario_propiedades.some((lp) => {
                      if (!lp.fecha_fin) return false;
                      const fin = new Date(lp.fecha_fin); fin.setHours(0, 0, 0, 0);
                      return fin <= in30;
                    });
                    if (!puedeRenovar) return null;
                    return (
                      <button
                        onClick={() => {
                          if (confirm("¿Enviar solicitud de RENOVACIÓN? Al aprobarse, se limpiarán todas las fechas, montos y períodos. Se mantendrán datos personales y propiedad asignada.")) {
                            renovarContrato.mutate();
                          }
                        }}
                        disabled={renovarContrato.isPending}
                        className="flex items-center gap-1.5 text-sm text-amber-700 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {renovarContrato.isPending ? "Enviando..." : "Renovar contrato"}
                      </button>
                    );
                  })()}
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => saveLocatario.mutate()}
                  disabled={saveLocatario.isPending || !form.nombre.trim()}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saveLocatario.isPending ? "Guardando..." : isNew ? "Guardar" : "Enviar a aprobación"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar locatario?"
        description={editing ? `Se eliminará a ${editing.nombre} y todos sus contratos vinculados. Esta acción no se puede deshacer.` : ""}
        onConfirm={() => { if (editing) deleteLocatario.mutate(editing.id); setConfirmDelete(false); }}
      />
    </div>

    {/* Printable area: ordered by Locador */}
    <div className="hidden print:block listing-print">
      <div className="lp-page">
        <header className="lp-header">
          <img src="/logo.png" alt="Logo" className="lp-logo" />
          <div className="lp-title">
            <h1>NEGOCIOS INMOBILIARIOS</h1>
            <p>Listado de Locatarios</p>
            <p>Generado el {new Date().toLocaleDateString("es-AR")}</p>
          </div>
        </header>

        {(() => {
          // Build groups: { locadorNombre: { rows: [{ locatario, lp, prop }] } }
          const groups = new Map<string, { locadorNombre: string; rows: { l: LocatarioConProps; lp: LocatarioProp & { propiedades?: Propiedad | null } }[] }>();
          const sinLoc: { l: LocatarioConProps; lp: LocatarioProp & { propiedades?: Propiedad | null } }[] = [];
          const sinContrato: LocatarioConProps[] = [];

          locatarios.forEach((l) => {
            if (l.locatario_propiedades.length === 0) {
              sinContrato.push(l);
              return;
            }
            l.locatario_propiedades.forEach((lp) => {
              const prop = propiedades.find((p) => p.id === lp.propiedad_id);
              const locNombre = prop?.locadores?.nombre ?? null;
              if (!locNombre) {
                sinLoc.push({ l, lp: { ...lp, propiedades: prop ?? null } });
                return;
              }
              if (!groups.has(locNombre)) groups.set(locNombre, { locadorNombre: locNombre, rows: [] });
              groups.get(locNombre)!.rows.push({ l, lp: { ...lp, propiedades: prop ?? null } });
            });
          });

          const ordered = Array.from(groups.values()).sort((a, b) => a.locadorNombre.localeCompare(b.locadorNombre));

          return (
            <>
              {ordered.map((g) => (
                <section key={g.locadorNombre} className="lp-locador-section">
                  <h2 className="lp-locador">Locador: {g.locadorNombre}</h2>
                  <table className="lp-table">
                    <thead>
                      <tr>
                        <th style={{ width: "20%" }}>Inquilino</th>
                        <th style={{ width: "12%" }}>DNI</th>
                        <th style={{ width: "14%" }}>Teléfono</th>
                        <th style={{ width: "20%" }}>Propiedad</th>
                        <th style={{ width: "11%" }}>Inicio</th>
                        <th style={{ width: "11%" }}>Fin</th>
                        <th style={{ width: "12%" }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows
                        .sort((a, b) => a.l.nombre.localeCompare(b.l.nombre))
                        .map(({ l, lp }) => (
                          <tr key={lp.id}>
                            <td>{l.nombre}</td>
                            <td>{l.dni ?? "—"}</td>
                            <td>{l.telefono ?? "—"}</td>
                            <td>{lp.propiedades?.direccion ?? "—"}</td>
                            <td>{lp.fecha_inicio ?? "—"}</td>
                            <td>{lp.fecha_fin ?? "—"}</td>
                            <td>${Number(lp.monto_base).toLocaleString("es-AR")}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </section>
              ))}

              {sinLoc.length > 0 && (
                <section className="lp-locador-section">
                  <h2 className="lp-locador">Sin locador asignado</h2>
                  <table className="lp-table">
                    <thead>
                      <tr>
                        <th>Inquilino</th>
                        <th>Propiedad</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sinLoc.map(({ l, lp }) => (
                        <tr key={lp.id}>
                          <td>{l.nombre}</td>
                          <td>{lp.propiedades?.direccion ?? "—"}</td>
                          <td>{lp.fecha_inicio ?? "—"}</td>
                          <td>{lp.fecha_fin ?? "—"}</td>
                          <td>${Number(lp.monto_base).toLocaleString("es-AR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {sinContrato.length > 0 && (
                <section className="lp-locador-section">
                  <h2 className="lp-locador">Locatarios sin contratos activos</h2>
                  <table className="lp-table">
                    <thead>
                      <tr>
                        <th>Inquilino</th>
                        <th>DNI</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sinContrato.map((l) => (
                        <tr key={l.id}>
                          <td>{l.nombre}</td>
                          <td>{l.dni ?? "—"}</td>
                          <td>{l.telefono ?? "—"}</td>
                          <td>{l.email ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          );
        })()}

        <footer className="lp-footer">
          <p>Negocios Inmobiliarios · Listado generado automáticamente</p>
        </footer>
      </div>
    </div>
    </>
  );
}
