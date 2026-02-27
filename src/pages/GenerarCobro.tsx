import { useState } from "react";
import { locatarios, locadores, propiedades } from "@/lib/mockData";
import { FileText, Printer } from "lucide-react";

export default function GenerarCobro() {
  const [form, setForm] = useState({
    locatario: "",
    locador: "",
    propiedad: "",
    monto: "",
    expensas: "",
    periodoDesde: "",
    periodoHasta: "",
    concepto: "Alquiler mensual",
    vencimiento: "",
  });
  const [generado, setGenerado] = useState(false);

  // Get properties for selected locatario
  const selectedLocatario = locatarios.find((x) => x.nombre === form.locatario);
  const propiedadesDisponibles = selectedLocatario
    ? propiedades.filter((p) => selectedLocatario.propiedadIds.includes(p.id))
    : [];

  // Get locadores for selected propiedad
  const selectedPropiedad = propiedades.find((p) => p.direccion === form.propiedad);
  const locadorDisponible = selectedPropiedad
    ? locadores.find((l) => l.id === selectedPropiedad.locadorId)
    : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "locatario") {
      const loc = locatarios.find((x) => x.nombre === value);
      if (loc) {
        const props = propiedades.filter((p) => loc.propiedadIds.includes(p.id));
        const firstProp = props[0];
        const locador = firstProp ? locadores.find((l) => l.id === firstProp.locadorId) : null;
        setForm((prev) => ({
          ...prev,
          locatario: value,
          propiedad: firstProp?.direccion ?? "",
          locador: locador?.nombre ?? "",
        }));
      } else {
        setForm((prev) => ({ ...prev, locatario: value, propiedad: "", locador: "" }));
      }
    }

    if (name === "propiedad") {
      const prop = propiedades.find((p) => p.direccion === value);
      const locador = prop ? locadores.find((l) => l.id === prop.locadorId) : null;
      setForm((prev) => ({ ...prev, propiedad: value, locador: locador?.nombre ?? "" }));
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerado(true);
  };

  if (generado) {
    const total = Number(form.monto) + Number(form.expensas || 0);
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-card rounded-xl border border-border p-8 space-y-6">
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">InmobilAdmin</h1>
              <p className="text-sm text-muted-foreground">Agencia de Administración Inmobiliaria</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Recibo Nº</p>
              <p className="text-2xl font-bold text-primary">#2024-0089</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</p>
              <p className="font-medium">{form.periodoDesde} → {form.periodoHasta}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vencimiento</p>
              <p className="font-medium">{form.vencimiento || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locatario</p>
              <p className="font-medium">{form.locatario}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locador</p>
              <p className="font-medium">{form.locador}</p>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Propiedad</p>
              <p className="font-medium">{form.propiedad}</p>
            </div>
          </div>

          <div className="bg-secondary rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">{form.concepto}</p>
              <p className="text-base font-semibold text-foreground">${Number(form.monto).toLocaleString("es-AR")}</p>
            </div>
            {Number(form.expensas) > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Expensas</p>
                <p className="text-base font-semibold text-foreground">${Number(form.expensas).toLocaleString("es-AR")}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-2xl font-bold text-foreground">Total: ${total.toLocaleString("es-AR")}</p>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "hsl(var(--badge-pending-bg))", color: "hsl(var(--badge-pending-text))" }}>
              Pendiente
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir Recibo
            </button>
            <button
              onClick={() => setGenerado(false)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
            >
              Nuevo Recibo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Generar Cobro
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Completá los datos para generar un recibo de alquiler.</p>
      </div>

      <form onSubmit={handleGenerate} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Locatario */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Locatario *</label>
            <select
              name="locatario"
              value={form.locatario}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Seleccionar locatario...</option>
              {locatarios.map((l) => (
                <option key={l.id} value={l.nombre}>{l.nombre}</option>
              ))}
            </select>
          </div>

          {/* Propiedad — aparece si hay más de 1 */}
          {propiedadesDisponibles.length > 1 && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Propiedad *</label>
              <select
                name="propiedad"
                value={form.propiedad}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Seleccionar propiedad...</option>
                {propiedadesDisponibles.map((p) => (
                  <option key={p.id} value={p.direccion}>{p.direccion}</option>
                ))}
              </select>
            </div>
          )}

          {/* Propiedad info (read-only si sólo hay 1) */}
          {propiedadesDisponibles.length === 1 && form.propiedad && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Propiedad</label>
              <div className="w-full px-3 py-2.5 text-sm bg-secondary/60 border border-border rounded-lg text-foreground">
                {form.propiedad}
              </div>
            </div>
          )}

          {/* Locador */}
          {form.propiedad && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Locador</label>
              <div className="w-full px-3 py-2.5 text-sm bg-secondary/60 border border-border rounded-lg text-foreground">
                {form.locador || "—"}
              </div>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Monto Alquiler (ARS) *</label>
            <input
              name="monto"
              type="number"
              value={form.monto}
              onChange={handleChange}
              required
              placeholder="85000"
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>

          {/* Expensas */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Expensas (ARS)</label>
            <input
              name="expensas"
              type="number"
              value={form.expensas}
              onChange={handleChange}
              placeholder="0"
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>

          {/* Período Desde - Hasta */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Período Desde *</label>
            <input
              name="periodoDesde"
              type="date"
              value={form.periodoDesde}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Período Hasta *</label>
            <input
              name="periodoHasta"
              type="date"
              value={form.periodoHasta}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Vencimiento */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Fecha de Vencimiento</label>
            <input
              name="vencimiento"
              type="date"
              value={form.vencimiento}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Concepto</label>
            <select
              name="concepto"
              value={form.concepto}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option>Alquiler mensual</option>
              <option>Depósito</option>
              <option>Reparaciones</option>
              <option>Otro</option>
            </select>
          </div>
        </div>

        {/* Total preview */}
        {(form.monto || form.expensas) && (
          <div className="bg-secondary rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total a cobrar</span>
            <span className="text-lg font-bold text-foreground">
              ${(Number(form.monto || 0) + Number(form.expensas || 0)).toLocaleString("es-AR")}
            </span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generar Recibo
          </button>
        </div>
      </form>
    </div>
  );
}
