import { useState, useRef } from "react";
import { locatarios, locadores, propiedades } from "@/lib/mockData";
import { FileText, Printer, Search } from "lucide-react";

// Helper: format date string (yyyy-mm-dd) → dd/mm/yyyy
function fmtDate(val: string) {
  if (!val) return "—";
  const [y, m, d] = val.split("-");
  if (!y || !m || !d) return val;
  return `${d}/${m}/${y}`;
}

// Helper: today as dd/mm/yyyy
function todayStr() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

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
  const [locSearch, setLocSearch] = useState("");
  const [locDropOpen, setLocDropOpen] = useState(false);
  const locSearchRef = useRef<HTMLInputElement>(null);

  const filteredLocatarios = locatarios.filter((l) =>
    l.nombre.toLowerCase().includes(locSearch.toLowerCase())
  );

  const selectedLocatario = locatarios.find((x) => x.nombre === form.locatario);
  const propiedadesDisponibles = selectedLocatario
    ? propiedades.filter((p) => selectedLocatario.propiedadIds.includes(p.id))
    : [];

  const handleSelectLocatario = (nombre: string) => {
    const loc = locatarios.find((x) => x.nombre === nombre);
    if (loc) {
      const props = propiedades.filter((p) => loc.propiedadIds.includes(p.id));
      const firstProp = props[0];
      const locador = firstProp ? locadores.find((l) => l.id === firstProp.locadorId) : null;
      setForm((prev) => ({
        ...prev,
        locatario: nombre,
        propiedad: firstProp?.direccion ?? "",
        locador: locador?.nombre ?? "",
        monto: loc.montoBase ? String(loc.montoBase) : prev.monto,
      }));
    } else {
      setForm((prev) => ({ ...prev, locatario: nombre, propiedad: "", locador: "" }));
    }
    setLocSearch(nombre);
    setLocDropOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
    // Set document title to use as PDF filename
    const safeName = form.locatario.replace(/\s+/g, "_");
    const today = todayStr().replace(/\//g, "-");
    const originalTitle = document.title;
    document.title = `${safeName}_${today}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  if (generado) {
    const monto = Number(form.monto);
    const expensas = Number(form.expensas || 0);
    const total = monto + expensas;

    // Cut line separator
    const cutLine = (
      <div style={{
        width: "100%", borderTop: "1.5px dashed #aaa",
        position: "relative", margin: "0",
      }}>
        <span style={{
          position: "absolute", left: "50%", top: "-9px",
          transform: "translateX(-50%)",
          fontSize: "9px", color: "#aaa", background: "white",
          padding: "0 6px", letterSpacing: "2px",
        }}>✂ - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
      </div>
    );

    // Get current month/year label
    const now = new Date();
    const mesAnio = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    const mesNum = String(now.getMonth() + 1).padStart(2, "0");
    const anioNum = now.getFullYear();
    const fechaConDiaBlanco = `__/${mesNum}/${anioNum}`;

    // 2 recibos juntos = mitad de A4 (~130mm) → cada uno = 65mm
    const halfContent = (tipo: "ORIGINAL" | "COPIA") => (
      <div style={{
        width: "190mm", height: "65mm", padding: "3mm 0mm 3mm 10mm",
        boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "11px",
        background: "white", display: "flex", flexDirection: "row", gap: "0",
      }}>
        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingRight: "8mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid #333", paddingBottom: "4px" }}>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>Recibo de Alquiler</div>
              <div style={{ color: "#666", fontSize: "9px" }}>Nº 2024-0089</div>
            </div>
            <div style={{ background: tipo === "ORIGINAL" ? "#1a1a2e" : "#e2e8f0", color: tipo === "ORIGINAL" ? "white" : "#333", padding: "4px 14px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" }}>
              {tipo}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px", flex: 1, alignContent: "start", paddingTop: "5px" }}>
            <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Locatario</span><br /><strong style={{ fontSize: "11px" }}>{form.locatario}</strong></div>
            <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Período</span><br /><strong style={{ fontSize: "11px" }}>{fmtDate(form.periodoDesde)} → {fmtDate(form.periodoHasta)}</strong></div>
            <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Vencimiento</span><br /><strong style={{ fontSize: "11px" }}>{fmtDate(form.vencimiento)}</strong></div>
            <div style={{ gridColumn: "span 3" }}><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Propiedad</span><br /><strong style={{ fontSize: "11px" }}>{form.propiedad}</strong></div>
          </div>
          <div style={{ background: "#f4f4f4", borderRadius: "4px", padding: "5px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{form.concepto}</span><strong>${monto.toLocaleString("es-AR")}</strong></div>
            {expensas > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}><span>Expensas</span><strong>${expensas.toLocaleString("es-AR")}</strong></div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1.5px solid #333", paddingTop: "4px" }}>
            <strong style={{ fontSize: "13px" }}>TOTAL: ${total.toLocaleString("es-AR")}</strong>
            <div style={{ textAlign: "right", fontSize: "8px", color: "#666" }}>
              <div>Firma:</div>
              <div style={{ borderBottom: "1px solid #333", width: "80px", marginTop: "14px" }}></div>
            </div>
          </div>
        </div>
        {/* Right strip: date + month/year */}
        <div style={{
          width: "22mm", borderLeft: "1.5px dashed #ccc",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "6px", padding: "4px 3mm",
        }}>
          <div style={{ fontSize: "8px", color: "#888", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.5px" }}>Fecha</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#222", letterSpacing: "1px", textAlign: "center" }}>{fechaConDiaBlanco}</div>
          <div style={{ fontSize: "8px", color: "#888", textTransform: "capitalize", textAlign: "center", marginTop: "4px" }}>{mesAnio}</div>
        </div>
      </div>
    );

    return (
      <>
        {/* Print-only area */}
        <div className="print-only">
          <div style={{ width: "190mm", background: "white" }}>
            {halfContent("ORIGINAL")}
            {cutLine}
            {halfContent("COPIA")}
            {cutLine}
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
              <div><p className="text-xs font-semibold text-muted-foreground uppercase">Vencimiento</p><p className="font-medium">{fmtDate(form.vencimiento)}</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-muted-foreground uppercase">Propiedad</p><p className="font-medium">{form.propiedad}</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-muted-foreground uppercase">Período</p><p className="font-medium">{fmtDate(form.periodoDesde)} → {fmtDate(form.periodoHasta)}</p></div>
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
                <Printer className="w-4 h-4" />Imprimir / Guardar PDF
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
          {/* Searchable Locatario selector */}
          <div className="sm:col-span-2 relative">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Locatario *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={locSearchRef}
                type="text"
                value={locSearch}
                placeholder="Buscar locatario..."
                required
                onFocus={() => setLocDropOpen(true)}
                onBlur={() => setTimeout(() => setLocDropOpen(false), 150)}
                onChange={(e) => {
                  setLocSearch(e.target.value);
                  setLocDropOpen(true);
                  if (e.target.value === "") setForm((p) => ({ ...p, locatario: "", propiedad: "", locador: "" }));
                }}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
            </div>
            {locDropOpen && filteredLocatarios.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredLocatarios.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onMouseDown={() => handleSelectLocatario(l.nombre)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-foreground">{l.nombre}</span>
                    <span className="text-xs text-muted-foreground">${l.montoBase.toLocaleString("es-AR")}/mes</span>
                  </button>
                ))}
              </div>
            )}
            {/* Hidden required input to enforce selection */}
            <input type="text" name="locatario" value={form.locatario} readOnly required className="sr-only" tabIndex={-1} />
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
