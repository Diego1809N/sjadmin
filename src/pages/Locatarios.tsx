import { useState } from "react";
import { locatarios as initialLocatarios, propiedades, locadores } from "@/lib/mockData";
import { Users, Pencil, X, Trash2, Bell } from "lucide-react";

type Locatario = {
  id: number;
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  propiedadIds: number[];
  locadorId: number;
  inicioAlquiler: string;
  finAlquiler: string;
  montoBase: number;
  ajusteMeses: number;
  indiceAjuste: string;
};

const INDICES = ["IPC", "ICL", "CVS", "IRM", "Acuerdo de partes"];

function getUpcomingAdjustments(locatarios: Locatario[]) {
  const now = new Date();
  const oneMonthAhead = new Date(now);
  oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
  return locatarios.filter((l) => {
    if (!l.inicioAlquiler || !l.ajusteMeses) return false;
    const inicio = new Date(l.inicioAlquiler);
    let next = new Date(inicio);
    while (next <= now) next.setMonth(next.getMonth() + l.ajusteMeses);
    return next <= oneMonthAhead;
  });
}

const emptyForm: Omit<Locatario, "id"> = {
  nombre: "", dni: "", telefono: "", email: "",
  propiedadIds: [], locadorId: 0,
  inicioAlquiler: "", finAlquiler: "",
  montoBase: 0, ajusteMeses: 3, indiceAjuste: "IPC",
};

export default function Locatarios() {
  const [locatarios, setLocatarios] = useState<Locatario[]>(initialLocatarios);
  const [editing, setEditing] = useState<Locatario | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Omit<Locatario, "id">>(emptyForm);

  const upcoming = getUpcomingAdjustments(locatarios);

  const openEdit = (l: Locatario) => {
    setEditing(l);
    setIsNew(false);
    setForm({ ...l });
  };

  const openNew = () => {
    setEditing({ id: -1, ...emptyForm });
    setIsNew(true);
    setForm({ ...emptyForm });
  };

  const handleFieldChange = (field: keyof Omit<Locatario, "id">, value: unknown) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const toggleProp = (propId: number) => {
    setForm((p) => ({
      ...p,
      propiedadIds: p.propiedadIds.includes(propId)
        ? p.propiedadIds.filter((id) => id !== propId)
        : [...p.propiedadIds, propId],
    }));
  };

  const handleSave = () => {
    if (isNew) {
      const newId = Math.max(...locatarios.map((l) => l.id), 0) + 1;
      setLocatarios((prev) => [...prev, { id: newId, ...form }]);
    } else if (editing) {
      setLocatarios((prev) => prev.map((l) => l.id === editing.id ? { id: editing.id, ...form } : l));
    }
    setEditing(null);
  };

  const handleDelete = (id: number) => {
    setLocatarios((prev) => prev.filter((l) => l.id !== id));
    setEditing(null);
  };

  const getPropNames = (ids: number[]) =>
    ids.map((id) => propiedades.find((p) => p.id === id)?.direccion ?? "").filter(Boolean).join(", ");

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
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nuevo Locatario
        </button>
      </div>

      {/* Upcoming adjustment alerts */}
      {upcoming.length > 0 && (
        <div className="bg-[hsl(var(--badge-pending-bg))] border border-[hsl(var(--badge-pending-text))]/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--badge-pending-text))]">
            <Bell className="w-4 h-4" />
            Próximos ajustes de alquiler (en menos de 1 mes)
          </div>
          {upcoming.map((l) => (
            <p key={l.id} className="text-xs text-[hsl(var(--badge-pending-text))] pl-6">
              {l.nombre} — cada {l.ajusteMeses} meses por {l.indiceAjuste}, base ${l.montoBase.toLocaleString("es-AR")}
            </p>
          ))}
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Alquiler</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {locatarios.map((l) => (
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
                        <p className="text-xs text-muted-foreground">{l.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{l.dni}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{l.telefono}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell max-w-xs truncate">{getPropNames(l.propiedadIds)}</td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">${l.montoBase.toLocaleString("es-AR")}</p>
                      <p>Ajuste c/{l.ajusteMeses}m · {l.indiceAjuste}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openEdit(l)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / New Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">{isNew ? "Nuevo Locatario" : "Editar Locatario"}</h2>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nombre y Apellido *</label>
                  <input value={form.nombre} onChange={(e) => handleFieldChange("nombre", e.target.value)} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">DNI</label>
                  <input value={form.dni} onChange={(e) => handleFieldChange("dni", e.target.value)} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="00.000.000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={(e) => handleFieldChange("telefono", e.target.value)} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="351-000-0000" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</label>
                  <input value={form.email} onChange={(e) => handleFieldChange("email", e.target.value)} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="email@ejemplo.com" />
                </div>
              </div>

              {/* Properties selection */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Propiedades que alquila</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {propiedades.map((p) => {
                    const loc = locadores.find((l) => l.id === p.locadorId);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                        <input
                          type="checkbox"
                          checked={form.propiedadIds.includes(p.id)}
                          onChange={() => toggleProp(p.id)}
                          className="accent-primary"
                        />
                        <span className="text-sm text-foreground">{p.direccion}</span>
                        {loc && <span className="text-xs text-muted-foreground ml-auto">({loc.nombre})</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Rental dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Inicio de Alquiler</label>
                  <input type="date" value={form.inicioAlquiler} onChange={(e) => handleFieldChange("inicioAlquiler", e.target.value)} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Finalización de Alquiler</label>
                  <input type="date" value={form.finAlquiler} onChange={(e) => handleFieldChange("finAlquiler", e.target.value)} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* Monto and adjustment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Monto Base (ARS)</label>
                  <input type="number" value={form.montoBase} onChange={(e) => handleFieldChange("montoBase", Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="85000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ajuste cada (meses)</label>
                  <input type="number" min={1} max={24} value={form.ajusteMeses} onChange={(e) => handleFieldChange("ajusteMeses", Number(e.target.value))} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Índice de Ajuste</label>
                  <select value={form.indiceAjuste} onChange={(e) => handleFieldChange("indiceAjuste", e.target.value)} className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {INDICES.map((i) => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              {!isNew && (
                <button onClick={() => handleDelete(editing.id)} className="flex items-center gap-1.5 text-sm text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
