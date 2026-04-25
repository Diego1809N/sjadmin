import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Building2, Plus, Trash2, X, Check, Pencil, Loader2, Printer, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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

type Locador = {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
};

type Propiedad = {
  id: string;
  direccion: string;
  locador_id: string | null;
  tipo: string | null;
  descripcion: string | null;
};

type PropiedadConContrato = {
  id: string;
  direccion: string;
  tipo: string | null;
  descripcion: string | null;
  locatario_propiedades?: {
    id: string;
    locatario_id: string;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    monto_base: number;
    intervalo_ajuste_meses: number | null;
    indice_actualizacion: string | null;
    notas: string | null;
    locatarios?: { nombre: string } | null;
  }[];
};

const INDICES = ["IPC", "ICL", "CVS", "IRM", "Acuerdo de partes"];

const emptyProp = {
  direccion: "",
  tipo: "",
  descripcion: "",
};

export default function Locadores() {
  const qc = useQueryClient();

  const [selectedLocador, setSelectedLocador] = useState<Locador | null>(null);
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Locador | null>(null);

  // New property form
  const [newProp, setNewProp] = useState(emptyProp);
  const [showPropForm, setShowPropForm] = useState(false);

  // Selected property for contract detail
  const [expandedPropId, setExpandedPropId] = useState<string | null>(null);

  // New locador form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLocador, setNewLocador] = useState({ nombre: "", dni: "", telefono: "", email: "", direccion: "" });
  const [confirmDeletePropId, setConfirmDeletePropId] = useState<string | null>(null);
  const [confirmDeleteLocador, setConfirmDeleteLocador] = useState(false);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: locadores = [], isLoading: loadingLoc } = useQuery({
    queryKey: ["locadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locadores").select("*").order("nombre");
      if (error) throw error;
      return data as Locador[];
    },
  });

  const { data: propiedades = [], isLoading: loadingProps } = useQuery({
    queryKey: ["propiedades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propiedades")
        .select(`
          id, direccion, tipo, descripcion, locador_id,
          locatario_propiedades (
            id, locatario_id, fecha_inicio, fecha_fin, monto_base,
            intervalo_ajuste_meses, indice_actualizacion, notas,
            locatarios ( nombre )
          )
        `)
        .order("direccion");
      if (error) throw error;
      return data as (Propiedad & PropiedadConContrato)[];
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const addLocador = useMutation({
    mutationFn: async (data: typeof newLocador) => {
      const { error } = await supabase.from("locadores").insert({
        nombre: data.nombre,
        dni: data.dni || null,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locadores"] });
      setNewLocador({ nombre: "", dni: "", telefono: "", email: "", direccion: "" });
      setShowNewForm(false);
    },
  });

  const updateLocador = useMutation({
    mutationFn: async (data: Locador) => {
      const { error } = await supabase
        .from("locadores")
        .update({ nombre: data.nombre, dni: data.dni, telefono: data.telefono, email: data.email, direccion: data.direccion })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["locadores"] });
      setSelectedLocador(vars);
      setEditMode(false);
    },
  });

  const deleteLocador = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locadores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locadores"] });
      qc.invalidateQueries({ queryKey: ["propiedades"] });
      setSelectedLocador(null);
    },
  });

  const addPropiedad = useMutation({
    mutationFn: async ({ locadorId, prop }: { locadorId: string; prop: typeof newProp }) => {
      const { error } = await supabase.from("propiedades").insert({
        direccion: prop.direccion,
        tipo: prop.tipo || null,
        descripcion: prop.descripcion || null,
        locador_id: locadorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["propiedades"] });
      setNewProp(emptyProp);
      setShowPropForm(false);
    },
  });

  const deletePropiedad = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("propiedades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["propiedades"] }),
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const propsByLocador = (id: string) => propiedades.filter((p) => p.locador_id === id);

  const filteredLocadores = useMemo(() => {
    if (!search.trim()) return locadores;
    const q = search.toLowerCase();
    return locadores.filter(
      (l) =>
        l.nombre.toLowerCase().includes(q) ||
        (l.dni ?? "").includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.telefono ?? "").includes(q) ||
        (l.direccion ?? "").toLowerCase().includes(q)
    );
  }, [locadores, search]);

  const openLocador = (l: Locador) => {
    setSelectedLocador(l);
    setEditData({ ...l });
    setEditMode(false);
    setNewProp(emptyProp);
    setShowPropForm(false);
    setExpandedPropId(null);
  };

  if (loadingLoc || loadingProps) {
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
            <UserCheck className="w-6 h-6 text-primary" />
            Locadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Propietarios registrados en el sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const originalTitle = document.title;
              document.title = "Locadores";
              setTimeout(() => { window.print(); document.title = originalTitle; }, 100);
            }}
            className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Nuevo Locador
          </button>
        </div>
      </div>

      {/* New Locador Form */}
      {showNewForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Nuevo Locador</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["nombre", "dni", "telefono", "email", "direccion"] as const).map((field) => (
              <input
                key={field}
                placeholder={field === "direccion" ? "Dirección" : field.charAt(0).toUpperCase() + field.slice(1)}
                value={newLocador[field]}
                onChange={(e) => setNewLocador((p) => ({ ...p, [field]: e.target.value }))}
                className="px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { if (newLocador.nombre.trim()) addLocador.mutate(newLocador); }}
              disabled={addLocador.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {addLocador.isPending ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar locador, DNI, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">DNI</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Propiedades</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocadores.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => openLocador(l)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "hsl(var(--stat-purple))", color: "hsl(var(--stat-purple-icon))" }}
                      >
                        {l.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-primary underline-offset-2 hover:underline">{l.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{l.dni ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{l.telefono ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{l.email ?? "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{propsByLocador(l.id).length}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {locadores.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-sm text-muted-foreground text-center">No hay locadores registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLocador && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedLocador(null)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">{selectedLocador.nombre}</h2>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => editData && updateLocador.mutate(editData)}
                      disabled={updateLocador.isPending}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors text-[hsl(var(--badge-delivered-text))]"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditMode(false); setEditData({ ...selectedLocador }); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedLocador(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Edit fields */}
              <div className="grid grid-cols-2 gap-3">
                {(["nombre", "dni", "telefono", "email", "direccion"] as const).map((field) => (
                  <div key={field} className={field === "nombre" || field === "email" || field === "direccion" ? "col-span-2" : ""}>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {field === "nombre" ? "Nombre" : field === "dni" ? "DNI" : field === "telefono" ? "Teléfono" : field === "email" ? "Email" : "Dirección"}
                    </label>
                    {editMode ? (
                      <input
                        value={(editData[field] as string) ?? ""}
                        onChange={(e) => setEditData((p) => p ? { ...p, [field]: e.target.value } : p)}
                        className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    ) : (
                      <p className="text-sm text-foreground">{(selectedLocador[field] as string) || "—"}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Properties with contract info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Propiedades</p>
                  <button
                    onClick={() => setShowPropForm((v) => !v)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>

                {/* Add property form */}
                {showPropForm && (
                  <div className="bg-secondary/60 border border-border rounded-xl p-4 mb-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nueva Propiedad</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs text-muted-foreground mb-1">Dirección *</label>
                        <input
                          value={newProp.direccion}
                          onChange={(e) => setNewProp((p) => ({ ...p, direccion: e.target.value }))}
                          placeholder="Ej: Av. Siempre Viva 742"
                          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Tipo</label>
                        <select
                          value={newProp.tipo}
                          onChange={(e) => setNewProp((p) => ({ ...p, tipo: e.target.value }))}
                          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Seleccionar...</option>
                          <option>Departamento</option>
                          <option>Casa</option>
                          <option>Local</option>
                          <option>Oficina</option>
                          <option>Garaje</option>
                          <option>Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Descripción</label>
                        <input
                          value={newProp.descripcion}
                          onChange={(e) => setNewProp((p) => ({ ...p, descripcion: e.target.value }))}
                          placeholder="Ej: Piso 4, Dpto B"
                          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { if (newProp.direccion.trim()) addPropiedad.mutate({ locadorId: selectedLocador.id, prop: newProp }); }}
                        disabled={addPropiedad.isPending}
                        className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {addPropiedad.isPending ? "Guardando..." : "Guardar"}
                      </button>
                      <button onClick={() => setShowPropForm(false)} className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-secondary transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {propsByLocador(selectedLocador.id).map((p) => {
                    const contracts = (p as PropiedadConContrato).locatario_propiedades ?? [];
                    const isExpanded = expandedPropId === p.id;
                    return (
                      <div key={p.id} className="border border-border rounded-xl overflow-hidden">
                        <div
                          className="flex items-center justify-between bg-secondary px-3 py-2.5 cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => setExpandedPropId(isExpanded ? null : p.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-foreground">{p.direccion}</span>
                              {p.tipo && <span className="ml-2 text-xs text-muted-foreground">· {p.tipo}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {contracts.length > 0 && (
                              <span className="text-xs text-muted-foreground">{contracts.length} contrato{contracts.length !== 1 ? "s" : ""}</span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeletePropId(p.id); }}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 py-3 space-y-3 bg-card">
                            {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
                            {contracts.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Sin contratos vinculados. Asigná un locatario desde la sección Locatarios.</p>
                            ) : (
                              contracts.map((c) => (
                                <div key={c.id} className="bg-secondary/60 rounded-lg p-3 text-xs space-y-1.5">
                                  <p className="font-semibold text-foreground text-sm">{c.locatarios?.nombre ?? "Locatario desconocido"}</p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                                    <span>Inicio: <strong className="text-foreground">{c.fecha_inicio ?? "—"}</strong></span>
                                    <span>Fin: <strong className="text-foreground">{c.fecha_fin ?? "—"}</strong></span>
                                    <span>Monto base: <strong className="text-foreground">${Number(c.monto_base).toLocaleString("es-AR")}</strong></span>
                                    <span>Ajuste: <strong className="text-foreground">c/{c.intervalo_ajuste_meses ?? 3}m · {c.indice_actualizacion ?? "ICL"}</strong></span>
                                  </div>
                                  {c.notas && <p className="text-muted-foreground">Notas: {c.notas}</p>}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {propsByLocador(selectedLocador.id).length === 0 && !showPropForm && (
                    <p className="text-sm text-muted-foreground italic">Sin propiedades asignadas.</p>
                  )}
                </div>
              </div>

              {/* Delete */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setConfirmDeleteLocador(true)}
                  disabled={deleteLocador.isPending}
                  className="flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Locador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDeletePropId}
        onOpenChange={(o) => !o && setConfirmDeletePropId(null)}
        title="¿Eliminar propiedad?"
        description="Se eliminará la propiedad y todos sus contratos vinculados. Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDeletePropId) deletePropiedad.mutate(confirmDeletePropId); setConfirmDeletePropId(null); }}
      />
      <ConfirmDialog
        open={confirmDeleteLocador}
        onOpenChange={setConfirmDeleteLocador}
        title="¿Eliminar locador?"
        description={selectedLocador ? `Se eliminará a ${selectedLocador.nombre} y todas sus propiedades vinculadas. Esta acción no se puede deshacer.` : ""}
        onConfirm={() => { if (selectedLocador) deleteLocador.mutate(selectedLocador.id); setConfirmDeleteLocador(false); }}
      />
    </div>
  );
}
