import { useState } from "react";
import { locatarios, locadores } from "@/lib/mockData";
import { FileText, Printer } from "lucide-react";

export default function GenerarCobro() {
  const [form, setForm] = useState({
    locatario: "",
    locador: "",
    propiedad: "",
    monto: "",
    periodo: "",
    concepto: "Alquiler mensual",
    fecha: new Date().toISOString().split("T")[0],
    vencimiento: "",
    observaciones: "",
  });
  const [generado, setGenerado] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "locatario") {
      const l = locatarios.find((x) => x.nombre === value);
      if (l) setForm((prev) => ({ ...prev, locatario: value, propiedad: l.propiedad, locador: l.locador }));
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerado(true);
  };

  if (generado) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-card rounded-xl border border-border p-8 space-y-6">
          {/* Receipt Header */}
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha de emisión</p>
              <p className="font-medium">{form.fecha}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</p>
              <p className="font-medium">{form.periodo}</p>
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

          <div className="bg-secondary rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{form.concepto}</p>
                {form.observaciones && <p className="text-xs text-muted-foreground mt-0.5">{form.observaciones}</p>}
              </div>
              <p className="text-xl font-bold text-foreground">${Number(form.monto).toLocaleString("es-AR")}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-2xl font-bold text-foreground">Total: ${Number(form.monto).toLocaleString("es-AR")}</p>
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "hsl(var(--badge-pending-bg))", color: "hsl(var(--badge-pending-text))" }}
            >
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
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Locatario *
            </label>
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

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Locador *
            </label>
            <input
              name="locador"
              value={form.locador}
              onChange={handleChange}
              required
              placeholder="Nombre del locador"
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Propiedad *
            </label>
            <input
              name="propiedad"
              value={form.propiedad}
              onChange={handleChange}
              required
              placeholder="Dirección de la propiedad"
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Monto (ARS) *
            </label>
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

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Período *
            </label>
            <input
              name="periodo"
              value={form.periodo}
              onChange={handleChange}
              required
              placeholder="Octubre 2024"
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Fecha de emisión *
            </label>
            <input
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Fecha de vencimiento
            </label>
            <input
              name="vencimiento"
              type="date"
              value={form.vencimiento}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Concepto
            </label>
            <select
              name="concepto"
              value={form.concepto}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option>Alquiler mensual</option>
              <option>Expensas</option>
              <option>Depósito</option>
              <option>Reparaciones</option>
              <option>Otro</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={3}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground resize-none"
            />
          </div>
        </div>

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
