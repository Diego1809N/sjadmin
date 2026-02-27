import { useState } from "react";
import { locadores as initialLocadores, propiedades as initialPropiedades } from "@/lib/mockData";
import { UserCheck, Building2, Plus, Trash2, X, Check, Pencil } from "lucide-react";

type Locador = { id: number; nombre: string; dni: string; telefono: string; email: string };
type Propiedad = { id: number; direccion: string; locadorId: number };

export default function Locadores() {
  const [locadores, setLocadores] = useState<Locador[]>(initialLocadores);
  const [propiedades, setPropiedades] = useState<Propiedad[]>(initialPropiedades);

  // Modal state
  const [selectedLocador, setSelectedLocador] = useState<Locador | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Locador | null>(null);
  const [newPropDir, setNewPropDir] = useState("");

  // New locador form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLocador, setNewLocador] = useState({ nombre: "", dni: "", telefono: "", email: "" });

  const propsByLocador = (id: number) => propiedades.filter((p) => p.locadorId === id);

  const openLocador = (l: Locador) => {
    setSelectedLocador(l);
    setEditData({ ...l });
    setEditMode(false);
    setNewPropDir("");
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    setLocadores((prev) => prev.map((l) => l.id === editData.id ? editData : l));
    setSelectedLocador(editData);
    setEditMode(false);
  };

  const handleAddProp = () => {
    if (!newPropDir.trim() || !selectedLocador) return;
    const newId = Math.max(...propiedades.map((p) => p.id), 0) + 1;
    setPropiedades((prev) => [...prev, { id: newId, direccion: newPropDir.trim(), locadorId: selectedLocador.id }]);
    setNewPropDir("");
  };

  const handleRemoveProp = (propId: number) => {
    setPropiedades((prev) => prev.filter((p) => p.id !== propId));
  };

  const handleAddLocador = () => {
    if (!newLocador.nombre.trim()) return;
    const newId = Math.max(...locadores.map((l) => l.id), 0) + 1;
    setLocadores((prev) => [...prev, { id: newId, ...newLocador }]);
    setNewLocador({ nombre: "", dni: "", telefono: "", email: "" });
    setShowNewForm(false);
  };

  const handleDeleteLocador = (id: number) => {
    setLocadores((prev) => prev.filter((l) => l.id !== id));
    setPropiedades((prev) => prev.filter((p) => p.locadorId !== id));
    setSelectedLocador(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Locadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Propietarios registrados en el sistema.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nuevo Locador
        </button>
      </div>

      {/* New Locador Form */}
      {showNewForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Nuevo Locador</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["nombre", "dni", "telefono", "email"] as const).map((field) => (
              <input
                key={field}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={newLocador[field]}
                onChange={(e) => setNewLocador((p) => ({ ...p, [field]: e.target.value }))}
                className="px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddLocador} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Guardar
            </button>
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
              Cancelar
            </button>
          </div>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Propiedades</th>
              </tr>
            </thead>
            <tbody>
              {locadores.map((l) => (
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
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{l.dni}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{l.telefono}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{l.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{propsByLocador(l.id).length}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLocador && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedLocador(null)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-foreground text-lg">{selectedLocador.nombre}</h2>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                ) : (
                  <>
                    <button onClick={handleSaveEdit} className="p-2 rounded-lg hover:bg-secondary transition-colors text-[hsl(var(--badge-delivered-text))]">
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

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Edit fields */}
              <div className="grid grid-cols-2 gap-3">
                {(["nombre", "dni", "telefono", "email"] as const).map((field) => (
                  <div key={field} className={field === "nombre" || field === "email" ? "col-span-2" : ""}>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {field === "nombre" ? "Nombre" : field === "dni" ? "DNI" : field === "telefono" ? "Teléfono" : "Email"}
                    </label>
                    {editMode ? (
                      <input
                        value={editData[field]}
                        onChange={(e) => setEditData((p) => p ? { ...p, [field]: e.target.value } : p)}
                        className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    ) : (
                      <p className="text-sm text-foreground">{selectedLocador[field]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Properties */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Propiedades</p>
                <div className="space-y-2">
                  {propsByLocador(selectedLocador.id).map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground">{p.direccion}</span>
                      </div>
                      <button onClick={() => handleRemoveProp(p.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  ))}
                  {propsByLocador(selectedLocador.id).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Sin propiedades asignadas.</p>
                  )}
                </div>

                {/* Add property */}
                <div className="flex gap-2 mt-3">
                  <input
                    value={newPropDir}
                    onChange={(e) => setNewPropDir(e.target.value)}
                    placeholder="Agregar propiedad..."
                    className="flex-1 px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddProp())}
                  />
                  <button
                    onClick={handleAddProp}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delete */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => handleDeleteLocador(selectedLocador.id)}
                  className="flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Locador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
