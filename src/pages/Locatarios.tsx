import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Pencil, X, Trash2, Bell, Search, Loader2, Download, History } from "lucide-react";

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
  monto_nuevo: number;
  intervalo_ajuste_meses: number;
  indice_actualizacion: string;
  notas: string;
};

const emptyForm = {
  nombre: "", dni: "", telefono: "", email: "", notas: "",
};

const emptyPropForm: PropForm = {
  propiedad_id: "",
  fecha_inicio: "",
  fecha_fin: "",
  monto_base: 0,
  monto_nuevo: 0,
  intervalo_ajuste_meses: 3,
  indice_actualizacion: "ICL",
  notas: "",
};

function getUpcomingAdjustments(locatarios: LocatarioConProps[]) {
  const now = new Date();
  const oneMonthAhead = new Date(now);
  oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
  return locatarios.filter((l) => {
    return l.locatario_propiedades.some((lp) => {
      if (!lp.fecha_inicio || !lp.intervalo_ajuste_meses) return false;
      const inicio = new Date(lp.fecha_inicio);
      let next = new Date(inicio);
      while (next <= now) next.setMonth(next.getMonth() + lp.intervalo_ajuste_meses);
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
  const [showHistory, setShowHistory] = useState<string | null>(null);

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

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const saveLocatario = useMutation({
    mutationFn: async () => {
      let locId = editing?.id;

      if (isNew) {
        const { data, error } = await supabase
          .from("locatarios")
          .insert({ nombre: form.nombre, dni: form.dni || null, telefono: form.telefono || null, email: form.email || null, notas: form.notas || null, monto_base: 0 })
          .select("id")
          .single();
        if (error) throw error;
        locId = data.id;
      } else if (locId) {
        const { error } = await supabase
          .from("locatarios")
          .update({ nombre: form.nombre, dni: form.dni || null, telefono: form.telefono || null, email: form.email || null, notas: form.notas || null })
          .eq("id", locId);
        if (error) throw error;

        // Remove deleted relations
        if (removedLpIds.length > 0) {
          const { error: delErr } = await supabase.from("locatario_propiedades").delete().in("id", removedLpIds);
          if (delErr) throw delErr;
        }
      }

      if (!locId) return;

      // Upsert property relations
      for (const pf of propForms) {
        if (!pf.propiedad_id) continue;
        const finalMonto = pf.monto_nuevo > 0 ? pf.monto_nuevo : pf.monto_base;
        const applyAdjust = pf.monto_nuevo > 0;
        const existingLp = editing?.locatario_propiedades.find((lp) => lp.propiedad_id === pf.propiedad_id);
        if (existingLp && !isNew) {
          // Save old price to history if monto is changing
          if (applyAdjust && Number(existingLp.monto_base) !== finalMonto) {
            await supabase.from("historial_precios").insert({
              locatario_id: locId!,
              propiedad_id: pf.propiedad_id,
              monto: Number(existingLp.monto_base),
              fecha_desde: existingLp.fecha_ultimo_ajuste || existingLp.fecha_inicio || new Date().toISOString().split("T")[0],
              fecha_hasta: new Date().toISOString().split("T")[0],
            });
          }
          const { error } = await supabase.from("locatario_propiedades").update({
            fecha_inicio: pf.fecha_inicio || null,
            fecha_fin: pf.fecha_fin || null,
            monto_base: finalMonto,
            intervalo_ajuste_meses: pf.intervalo_ajuste_meses,
            indice_actualizacion: pf.indice_actualizacion,
            notas: pf.notas || null,
            ...(applyAdjust ? { fecha_ultimo_ajuste: new Date().toISOString().split("T")[0] } : {}),
          }).eq("id", existingLp.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("locatario_propiedades").insert({
            locatario_id: locId,
            propiedad_id: pf.propiedad_id,
            fecha_inicio: pf.fecha_inicio || null,
            fecha_fin: pf.fecha_fin || null,
            monto_base: finalMonto,
            intervalo_ajuste_meses: pf.intervalo_ajuste_meses,
            indice_actualizacion: pf.indice_actualizacion,
            notas: pf.notas || null,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locatarios"] });
      qc.invalidateQueries({ queryKey: ["propiedades"] });
      setEditing(null);
    },
  });

  const deleteLocatario = useMutation({
    mutationFn: async (id: string) => {
      // locatario_propiedades are deleted automatically via ON DELETE CASCADE
      const { error } = await supabase.from("locatarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locatarios"] });
      qc.invalidateQueries({ queryKey: ["stat-locatarios"] });
      qc.invalidateQueries({ queryKey: ["stat-propiedades"] });
      qc.invalidateQueries({ queryKey: ["propiedades"] });
      qc.invalidateQueries({ queryKey: ["propiedades-list"] });
      setEditing(null);
    },
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

  const openEdit = (l: LocatarioConProps) => {
    setEditing(l);
    setIsNew(false);
    setForm({ nombre: l.nombre, dni: l.dni ?? "", telefono: l.telefono ?? "", email: l.email ?? "", notas: l.notas ?? "" });
    setPropForms(l.locatario_propiedades.map((lp) => ({
      propiedad_id: lp.propiedad_id,
      fecha_inicio: lp.fecha_inicio ?? "",
      fecha_fin: lp.fecha_fin ?? "",
      monto_base: Number(lp.monto_base),
      monto_nuevo: 0,
      intervalo_ajuste_meses: lp.intervalo_ajuste_meses ?? 3,
      indice_actualizacion: lp.indice_actualizacion ?? "ICL",
      notas: lp.notas ?? "",
    })));
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
    <div className="p-6 space-y-6">
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
              const rows = locatarios.map((l) => ({
                Nombre: l.nombre,
                DNI: l.dni ?? "",
                Teléfono: l.telefono ?? "",
                Email: l.email ?? "",
                Notas: l.notas ?? "",
                Propiedades: getPropNames(l),
              }));
              exportToCSV("locatarios.csv", rows);
            }}
            className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar
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
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "hsl(var(--stat-orange))", color: "hsl(var(--stat-orange-icon))" }}
                      >
                        {l.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{l.nombre}</p>
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
              ))}
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
                          <label className="block text-xs text-muted-foreground mb-1">Monto actual (ARS)</label>
                          <input type="number" value={pf.monto_base} onChange={(e) => updatePropForm(idx, "monto_base", Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="85000" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Monto nuevo (ARS)</label>
                          <input type="number" value={pf.monto_nuevo || ""} onChange={(e) => updatePropForm(idx, "monto_nuevo", Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 border-primary/30" placeholder="Dejar vacío si no hay ajuste" />
                          <p className="text-xs text-muted-foreground mt-0.5 italic">Completar solo al aplicar un ajuste</p>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Ajuste cada (meses)</label>
                          <input type="number" min={1} max={24} value={pf.intervalo_ajuste_meses} onChange={(e) => updatePropForm(idx, "intervalo_ajuste_meses", Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              {!isNew && (
                <button
                  onClick={() => deleteLocatario.mutate(editing.id)}
                  disabled={deleteLocatario.isPending}
                  className="flex items-center gap-1.5 text-sm text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />Eliminar
                </button>
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
                  {saveLocatario.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
