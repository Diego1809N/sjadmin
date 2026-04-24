import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, Trash2, Pencil, X, Search, Loader2, Printer, Check } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const SERVICIOS_DISPONIBLES = ["Agua", "Luz", "Gas", "Internet", "Cable", "Expensas", "ABL", "Otros"];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

type ServicioRow = {
  id: string;
  locatario_id: string;
  propiedad_id: string | null;
  servicios: string[];
  notas: string | null;
  locatarios?: { id: string; nombre: string } | null;
  propiedades?: { id: string; direccion: string; locador_id: string | null; locadores?: { id: string; nombre: string } | null } | null;
};

export default function Servicios() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServicioRow | null>(null);
  const [search, setSearch] = useState("");
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [locatarioId, setLocatarioId] = useState("");
  const [propiedadId, setPropiedadId] = useState("");
  const [servicios, setServicios] = useState<string[]>([]);
  const [notas, setNotas] = useState("");

  // Fetch servicios
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["servicios_locatario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios_locatario")
        .select("*, locatarios(id, nombre), propiedades(id, direccion, locador_id, locadores(id, nombre))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServicioRow[];
    },
  });

  // Fetch locatarios with propiedades
  const { data: locatarios = [] } = useQuery({
    queryKey: ["locatarios_con_props"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locatarios")
        .select("id, nombre, locatario_propiedades(propiedad_id, propiedades(id, direccion, locador_id, locadores(id, nombre)))")
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const propiedadesDelLocatario = useMemo(() => {
    if (!locatarioId) return [];
    const loc = locatarios.find((l: any) => l.id === locatarioId);
    if (!loc) return [];
    return (loc as any).locatario_propiedades
      ?.map((lp: any) => lp.propiedades)
      .filter(Boolean) ?? [];
  }, [locatarioId, locatarios]);

  const resetForm = () => {
    setLocatarioId(""); setPropiedadId(""); setServicios([]); setNotas("");
    setEditing(null); setShowForm(false);
  };

  const startEdit = (r: ServicioRow) => {
    setEditing(r);
    setLocatarioId(r.locatario_id);
    setPropiedadId(r.propiedad_id ?? "");
    setServicios(r.servicios ?? []);
    setNotas(r.notas ?? "");
    setShowForm(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!locatarioId) throw new Error("Seleccioná un locatario");
      if (servicios.length === 0) throw new Error("Marcá al menos un servicio");

      const payload = {
        locatario_id: locatarioId,
        propiedad_id: propiedadId || null,
        servicios,
        notas: notas || null,
      };

      if (editing) {
        const { error } = await supabase.from("servicios_locatario").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("servicios_locatario").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Registro actualizado" : "Registro creado");
      qc.invalidateQueries({ queryKey: ["servicios_locatario"] });
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("servicios_locatario").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro eliminado");
      qc.invalidateQueries({ queryKey: ["servicios_locatario"] });
    },
  });

  const toggleServicio = (s: string) => {
    setServicios((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return registros;
    return registros.filter((r) =>
      r.locatarios?.nombre.toLowerCase().includes(q) ||
      r.propiedades?.direccion.toLowerCase().includes(q) ||
      r.propiedades?.locadores?.nombre.toLowerCase().includes(q)
    );
  }, [registros, search]);

  // Group by locador for PDF
  const handlePrint = () => {
    if (registros.length === 0) {
      toast.error("No hay registros para imprimir");
      return;
    }
    const originalTitle = document.title;
    document.title = `Servicios_${MESES[mes]}_${anio}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  // Group registros by locador for the printable view
  const grouped = useMemo(() => {
    const map = new Map<string, { locadorNombre: string; items: ServicioRow[] }>();
    registros.forEach((r) => {
      const locId = r.propiedades?.locador_id ?? "sin-locador";
      const locNombre = r.propiedades?.locadores?.nombre ?? "Sin locador asignado";
      if (!map.has(locId)) map.set(locId, { locadorNombre: locNombre, items: [] });
      map.get(locId)!.items.push(r);
    });
    return Array.from(map.values()).sort((a, b) => a.locadorNombre.localeCompare(b.locadorNombre));
  }, [registros]);

  return (
    <>
      <div className="p-6 md:p-8 print:hidden">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Wrench className="w-6 h-6 text-primary" />
                Servicios
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestioná qué servicios paga cada inquilino y generá la planilla mensual de control.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm w-24"
              />
              <button
                onClick={handlePrint}
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="h-10 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por locatario, propiedad o locador..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm"
            />
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-card border border-border rounded-lg p-5 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">
                  {editing ? "Editar registro" : "Nuevo registro"}
                </h2>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Locatario *</label>
                  <select
                    value={locatarioId}
                    onChange={(e) => { setLocatarioId(e.target.value); setPropiedadId(""); }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {locatarios.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Propiedad {propiedadesDelLocatario.length > 1 && <span className="text-primary">(múltiples contratos)</span>}
                  </label>
                  <select
                    value={propiedadId}
                    onChange={(e) => setPropiedadId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    disabled={!locatarioId}
                  >
                    <option value="">{propiedadesDelLocatario.length === 0 ? "Sin propiedades" : "Seleccionar propiedad..."}</option>
                    {propiedadesDelLocatario.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.direccion}{p.locadores?.nombre ? ` — ${p.locadores.nombre}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Servicios que paga *</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICIOS_DISPONIBLES.map((s) => {
                    const active = servicios.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleServicio(s)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-secondary"
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
                <input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  placeholder="Opcional"
                />
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMut.isPending ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-lg">
              No hay registros. Agregá un inquilino y los servicios que paga.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Locatario</th>
                    <th className="text-left px-4 py-3 font-medium">Propiedad</th>
                    <th className="text-left px-4 py-3 font-medium">Locador</th>
                    <th className="text-left px-4 py-3 font-medium">Servicios</th>
                    <th className="text-right px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-foreground">{r.locatarios?.nombre ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.propiedades?.direccion ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.propiedades?.locadores?.nombre ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.servicios.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(r)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(r.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Printable area */}
      <div className="hidden print:block servicios-print">
        <div className="print-page">
          <header className="print-header">
            <img src="/logo.png" alt="Logo" className="print-logo" />
            <div className="print-title">
              <h1>NEGOCIOS INMOBILIARIOS</h1>
              <p>Planilla de Control de Servicios</p>
              <p className="print-period">{MESES[mes]} {anio}</p>
            </div>
          </header>

          {grouped.map((g) => (
            <section key={g.locadorNombre} className="print-locador-section">
              <h2 className="print-locador">Locador: {g.locadorNombre}</h2>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Inquilino</th>
                    <th style={{ width: "23%" }}>Propiedad</th>
                    <th style={{ width: "20%" }}>Servicio</th>
                    <th style={{ width: "8%" }}>Pagó</th>
                    <th style={{ width: "13%" }}>Fecha pago</th>
                    <th style={{ width: "14%" }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((r) =>
                    r.servicios.map((s, idx) => (
                      <tr key={`${r.id}-${s}`}>
                        {idx === 0 ? (
                          <>
                            <td rowSpan={r.servicios.length} className="print-name">{r.locatarios?.nombre ?? "—"}</td>
                            <td rowSpan={r.servicios.length} className="print-prop">{r.propiedades?.direccion ?? "—"}</td>
                          </>
                        ) : null}
                        <td>{s}</td>
                        <td className="print-check"><span className="print-box" /></td>
                        <td className="print-line"></td>
                        <td className="print-line">$</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          ))}

          <footer className="print-footer">
            <p>Generado el {new Date().toLocaleDateString("es-AR")}</p>
          </footer>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="¿Eliminar registro de servicios?"
        description="Se eliminará la ficha de servicios del inquilino seleccionado. Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDeleteId) deleteMut.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
      />
    </>
  );
}
