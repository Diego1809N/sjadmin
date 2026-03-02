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

  const selectedLocatario = locatarios.find((x) => x.nombre === form.locatario);
  const propiedadesDisponibles = selectedLocatario
    ? propiedades.filter((p) => selectedLocatario.propiedadIds.includes(p.id))
    : [];

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
        setForm((prev) => ({ ...prev, locatario: value, propiedad: firstProp?.direccion ?? "", locador: locador?.nombre ?? "" }));
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

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  if (generado) {
    const monto = Number(form.monto);
    const expensas = Number(form.expensas || 0);
    const total = monto + expensas;

    // Each receipt = half of A4/2 = 64mm tall (2 together = 128mm = half of 277mm usable)
    const halfContent = (tipo: "ORIGINAL" | "COPIA") => (
      <div style={{
        width: "190mm", height: "64mm", padding: "5mm 10mm",
        boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "10px",
        background: "white", display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid #333", paddingBottom: "3px" }}>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "13px" }}>Recibo de Alquiler</div>
            <div style={{ color: "#666", fontSize: "9px" }}>Nº 2024-0089</div>
          </div>
          <div style={{ background: tipo === "ORIGINAL" ? "#1a1a2e" : "#e2e8f0", color: tipo === "ORIGINAL" ? "white" : "#333", padding: "3px 10px", borderRadius: "4px", fontWeight: "bold", fontSize: "10px" }}>
            {tipo}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
          <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Locatario</span><br /><strong style={{ fontSize: "10px" }}>{form.locatario}</strong></div>
          <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Período</span><br /><strong style={{ fontSize: "10px" }}>{form.periodoDesde} → {form.periodoHasta}</strong></div>
          <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Vencimiento</span><br /><strong style={{ fontSize: "10px" }}>{form.vencimiento || "—"}</strong></div>
          <div style={{ gridColumn: "span 3" }}><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Propiedad</span><br /><strong style={{ fontSize: "10px" }}>{form.propiedad}</strong></div>
        </div>
        <div style={{ background: "#f4f4f4", borderRadius: "4px", padding: "3px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>{form.concepto}</span><strong>${monto.toLocaleString("es-AR")}</strong></div>
          {expensas > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Expensas</span><strong>${expensas.toLocaleString("es-AR")}</strong></div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1.5px solid #333", paddingTop: "3px" }}>
          <strong style={{ fontSize: "12px" }}>TOTAL: ${total.toLocaleString("es-AR")}</strong>
          <div style={{ textAlign: "right", fontSize: "8px", color: "#666" }}>
            <div>Firma:</div>
            <div style={{ borderBottom: "1px solid #333", width: "70px", marginTop: "10px" }}></div>
          </div>
        </div>
      </div>
    );

    return (
      <>
        {/* Print-only area */}
        <div className="print-only">
          <div style={{ width: "190mm", background: "white" }}>
            <div style={{ borderBottom: "1px dashed #aaa" }}>{halfContent("ORIGINAL")}</div>
            <div>{halfContent("COPIA")}</div>
          </div>
        </div>

        {/* Screen preview */}
        <div className="no-print p-6 max-w-2xl mx-auto">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Recibo Nº</p>
                <p className="text-2xl font-bold text-primary">#2024-0089</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "hsl(var(--badge-pending-bg))", color: "hsl(var(--badge-pending-text))" }}>Pendiente</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs font-semibold text-muted-foreground uppercase">Locatario</p><p className="font-medium">{form.locatario}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase">Vencimiento</p><p className="font-medium">{form.vencimiento || "—"}</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-muted-foreground uppercase">Propiedad</p><p className="font-medium">{form.propiedad}</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-muted-foreground uppercase">Período</p><p className="font-medium">{form.periodoDesde} → {form.periodoHasta}</p></div>
            </div>
            <div className="bg-secondary rounded-lg p-4 space-y-2">
              <div className="flex justify-between"><span className="text-sm">{form.concepto}</span><span className="font-semibold">${monto.toLocaleString("es-AR")}</span></div>
              {expensas > 0 && <div className="flex justify-between"><span className="text-sm">Expensas</span><span className="font-semibold">${expensas.toLocaleString("es-AR")}</span></div>}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xl font-bold">Total: ${total.toLocaleString("es-AR")}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Printer className="w-4 h-4" />Imprimir Recibo
              </button>
              <button onClick={() => setGenerado(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">
                Nuevo Recibo
              </button>
            </div>
          </div>
        </div>
      </>
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
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Locatario *</label>
            <select name="locatario" value={form.locatario} onChange={handleChange} required className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Seleccionar locatario...</option>
              {locatarios.map((l) => (<option key={l.id} value={l.nombre}>{l.nombre}</option>))}
            </select>
          </div>
          {propiedadesDisponibles.length > 1 && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Propiedad *</label>
              <select name="propiedad" value={form.propiedad} onChange={handleChange} required className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Seleccionar propiedad...</option>
                {propiedadesDisponibles.map((p) => (<option key={p.id} value={p.direccion}>{p.direccion}</option>))}
              </select>
            </div>
          )}
          {propiedadesDisponibles.length === 1 && form.propiedad && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Propiedad</label>
              <div className="w-full px-3 py-2.5 text-sm bg-secondary/60 border border-border rounded-lg">{form.propiedad}</div>
            </div>
          )}
          {form.propiedad && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Locador</label>
              <div className="w-full px-3 py-2.5 text-sm bg-secondary/60 border border-border rounded-lg">{form.locador || "—"}</div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Monto Alquiler (ARS) *</label>
            <input name="monto" type="number" value={form.monto} onChange={handleChange} required placeholder="85000" className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Expensas (ARS)</label>
            <input name="expensas" type="number" value={form.expensas} onChange={handleChange} placeholder="0" className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Período Desde *</label>
            <input name="periodoDesde" type="date" value={form.periodoDesde} onChange={handleChange} required className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Período Hasta *</label>
            <input name="periodoHasta" type="date" value={form.periodoHasta} onChange={handleChange} required className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Fecha de Vencimiento</label>
            <input name="vencimiento" type="date" value={form.vencimiento} onChange={handleChange} className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Concepto</label>
            <select name="concepto" value={form.concepto} onChange={handleChange} className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option>Alquiler mensual</option>
              <option>Depósito</option>
              <option>Reparaciones</option>
              <option>Otro</option>
            </select>
          </div>
        </div>
        {(form.monto || form.expensas) && (
          <div className="bg-secondary rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total a cobrar</span>
            <span className="text-lg font-bold text-foreground">${(Number(form.monto || 0) + Number(form.expensas || 0)).toLocaleString("es-AR")}</span>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <FileText className="w-4 h-4" />Generar Recibo
          </button>
        </div>
      </form>
    </div>
  );
}
