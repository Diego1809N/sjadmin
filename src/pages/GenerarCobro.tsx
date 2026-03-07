import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Printer, Search, Plus, Trash2 } from "lucide-react";

// Helper: format date string (yyyy-mm-dd) → dd/mm/yyyy
function fmtDate(val: string) {
  if (!val) return "—";
  const [y, m, d] = val.split("-");
  if (!y || !m || !d) return val;
  return `${d}/${m}/${y}`;
}

function todayStr() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

type Concepto = {
  label: string;
  key: string;
  monto: number;
};

const CONCEPTOS_BASE = [
  { label: "Alquiler mensual", key: "alquiler" },
  { label: "Expensas", key: "expensas" },
  { label: "Agua", key: "agua" },
  { label: "Luz", key: "luz" },
  { label: "Gas", key: "gas" },
  { label: "Arreglos", key: "arreglos" },
  { label: "Servicios", key: "servicios" },
];

type LocatarioOption = {
  id: string;
  nombre: string;
  locatario_propiedades: {
    propiedad_id: string;
    monto_base: number;
    propiedades?: {
      id: string;
      direccion: string;
      locador_id: string | null;
      locadores?: { nombre: string } | null;
    } | null;
  }[];
};

export default function GenerarCobro() {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    locatario_id: "",
    locatario: "",
    locador: "",
    propiedad: "",
    periodoDesde: "",
    periodoHasta: "",
    vencimiento: "",
  });

  const [conceptos, setConceptos] = useState<Concepto[]>([
    { label: "Alquiler mensual", key: "alquiler", monto: 0 },
  ]);

  const [generado, setGenerado] = useState(false);
  const [nroSerie, setNroSerie] = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [locDropOpen, setLocDropOpen] = useState(false);
  const locSearchRef = useRef<HTMLInputElement>(null);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: locatarios = [] } = useQuery({
    queryKey: ["locatarios-gen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locatarios")
        .select(`
          id, nombre,
          locatario_propiedades (
            propiedad_id, monto_base,
            propiedades ( id, direccion, locador_id, locadores ( nombre ) )
          )
        `)
        .order("nombre");
      if (error) throw error;
      return data as LocatarioOption[];
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const guardarRecibo = useMutation({
    mutationFn: async () => {
      const { data: nroData, error: nroErr } = await supabase.rpc("next_nro_serie");
      if (nroErr) throw nroErr;
      const nro = nroData as string;
      setNroSerie(nro);

      const alquilerConcepto = conceptos.find((c) => c.key === "alquiler");
      const expensasConcepto = conceptos.find((c) => c.key === "expensas");
      const aguaConcepto = conceptos.find((c) => c.key === "agua");
      const luzConcepto = conceptos.find((c) => c.key === "luz");
      const gasConcepto = conceptos.find((c) => c.key === "gas");
      const arreglosConcepto = conceptos.find((c) => c.key === "arreglos");
      const serviciosConcepto = conceptos.find((c) => c.key === "servicios");

      const { error } = await supabase.from("recibos").insert({
        nro_serie: nro,
        locatario_id: form.locatario_id || null,
        locatario_nombre: form.locatario,
        locador_nombre: form.locador || null,
        propiedad: form.propiedad,
        monto: alquilerConcepto?.monto ?? 0,
        expensas: expensasConcepto?.monto ?? 0,
        agua: aguaConcepto?.monto ?? 0,
        luz: luzConcepto?.monto ?? 0,
        gas: gasConcepto?.monto ?? 0,
        arreglos: arreglosConcepto?.monto ?? 0,
        servicios: serviciosConcepto?.monto ?? 0,
        periodo_desde: form.periodoDesde || null,
        periodo_hasta: form.periodoHasta || null,
        vencimiento: form.vencimiento || null,
        concepto: conceptos.filter((c) => c.monto > 0).map((c) => c.label).join(", "),
        estado: "Pendiente",
      });
      if (error) throw error;
      return nro;
    },
    onSuccess: (nro) => {
      setNroSerie(nro);
      setGenerado(true);
      qc.invalidateQueries({ queryKey: ["recibos"] });
    },
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const filteredLocatarios = locatarios.filter((l) =>
    l.nombre.toLowerCase().includes(locSearch.toLowerCase())
  );

  const selectedLocatario = locatarios.find((x) => x.id === form.locatario_id);
  const propiedadesDisponibles = selectedLocatario?.locatario_propiedades ?? [];

  const handleSelectLocatario = (loc: LocatarioOption) => {
    const firstLp = loc.locatario_propiedades[0];
    const prop = firstLp?.propiedades;
    const locadorNombre = prop?.locadores?.nombre ?? "";
    setForm((prev) => ({
      ...prev,
      locatario_id: loc.id,
      locatario: loc.nombre,
      propiedad: prop?.direccion ?? "",
      locador: locadorNombre,
    }));
    if (firstLp?.monto_base) {
      setConceptos((prev) =>
        prev.map((c) => c.key === "alquiler" ? { ...c, monto: Number(firstLp.monto_base) } : c)
      );
    }
    setLocSearch(loc.nombre);
    setLocDropOpen(false);
  };

  const handlePropChange = (propDir: string) => {
    const lp = selectedLocatario?.locatario_propiedades.find((p) => p.propiedades?.direccion === propDir);
    const locadorNombre = lp?.propiedades?.locadores?.nombre ?? "";
    setForm((prev) => ({ ...prev, propiedad: propDir, locador: locadorNombre }));
    if (lp?.monto_base) {
      setConceptos((prev) =>
        prev.map((c) => c.key === "alquiler" ? { ...c, monto: Number(lp.monto_base) } : c)
      );
    }
  };

  const addConcepto = (key: string, label: string) => {
    if (conceptos.find((c) => c.key === key)) return;
    setConceptos((prev) => [...prev, { label, key, monto: 0 }]);
  };

  const removeConcepto = (key: string) => {
    setConceptos((prev) => prev.filter((c) => c.key !== key));
  };

  const updateMonto = (key: string, val: number) => {
    setConceptos((prev) => prev.map((c) => c.key === key ? { ...c, monto: val } : c));
  };

  const total = conceptos.reduce((s, c) => s + c.monto, 0);

  const handlePrint = () => {
    const safeName = form.locatario.replace(/\s+/g, "_");
    const today = todayStr().replace(/\//g, "-");
    const originalTitle = document.title;
    document.title = `${safeName}_${today}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  // ─── Get month/year for receipt ───────────────────────────────────────────
  const now = new Date();
  const mesAnio = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const mesNum = String(now.getMonth() + 1).padStart(2, "0");
  const anioNum = now.getFullYear();
  const fechaConDiaBlanco = `__/${mesNum}/${anioNum}`;

  // ─── Print receipt ────────────────────────────────────────────────────────
  const conceptosConMonto = conceptos.filter((c) => c.monto > 0);

  // Each receipt = exactly half A4 = 148.5mm tall, full width 210mm
  const halfContent = (tipo: "ORIGINAL" | "COPIA") => (
    <div style={{
      width: "210mm",
      height: "148.5mm",
      padding: "6mm 10mm",
      boxSizing: "border-box",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      background: "white",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid #333", paddingBottom: "5px" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "16px" }}>Recibo de Alquiler</div>
          <div style={{ color: "#666", fontSize: "9px", marginTop: "2px" }}>Nº {nroSerie}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "9px", color: "#666", textAlign: "right" }}>
            <span style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>Fecha de pago</span><br />
            <strong style={{ fontSize: "13px", color: "#222" }}>{fechaConDiaBlanco}</strong>
            <span style={{ display: "block", fontSize: "8px", textTransform: "capitalize", color: "#888" }}>{mesAnio}</span>
          </div>
          <div style={{
            background: tipo === "ORIGINAL" ? "#1a1a2e" : "#e2e8f0",
            color: tipo === "ORIGINAL" ? "white" : "#333",
            padding: "5px 16px", borderRadius: "4px", fontWeight: "bold", fontSize: "12px",
          }}>
            {tipo}
          </div>
        </div>
      </div>

      {/* Info fields */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr 2fr", gap: "6px 14px", paddingTop: "6px" }}>
        <div>
          <span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Locatario</span><br />
          <strong style={{ fontSize: "12px" }}>{form.locatario}</strong>
        </div>
        <div>
          <span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Propiedad</span><br />
          <strong style={{ fontSize: "12px" }}>{form.propiedad}</strong>
        </div>
        <div>
          <span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Vencimiento</span><br />
          <strong style={{ fontSize: "12px" }}>{fmtDate(form.vencimiento)}</strong>
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Período</span><br />
          <strong style={{ fontSize: "12px" }}>{fmtDate(form.periodoDesde)} al {fmtDate(form.periodoHasta)}</strong>
        </div>
      </div>

      {/* Concepts table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        <div style={{ background: "#f4f4f4", borderRadius: "4px", padding: "5px 10px" }}>
          {conceptosConMonto.map((c) => (
            <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", borderBottom: "0.5px solid #e0e0e0" }}>
              <span style={{ fontSize: "10px" }}>{c.label}</span>
              <strong style={{ fontSize: "10px" }}>${c.monto.toLocaleString("es-AR")}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: total + signature */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1.5px solid #333", paddingTop: "6px" }}>
        <strong style={{ fontSize: "16px", whiteSpace: "nowrap" }}>TOTAL: ${total.toLocaleString("es-AR")}</strong>
        <div style={{ textAlign: "right", fontSize: "8px", color: "#666" }}>
          <div>Firma y Aclaración:</div>
          <div style={{ borderBottom: "1px solid #333", width: "100px", marginTop: "16px" }}></div>
        </div>
      </div>
    </div>
  );

  if (generado) {
    return (
      <>
        {/* Print-only area */}
        <div className="print-only">
          <div style={{ width: "210mm", height: "297mm", background: "white", display: "flex", flexDirection: "column" }}>
            {halfContent("ORIGINAL")}
            <div style={{ borderTop: "1.5px dashed #aaa", position: "relative", margin: "0", flexShrink: 0 }}>
              <span style={{ position: "absolute", left: "50%", top: "-9px", transform: "translateX(-50%)", fontSize: "9px", color: "#aaa", background: "white", padding: "0 6px", letterSpacing: "2px" }}>
                ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂
              </span>
            </div>
            {halfContent("COPIA")}
          </div>
        </div>

        {/* Screen preview */}
        <div className="no-print p-6 max-w-2xl mx-auto">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Recibo Nº</p>
                <p className="text-2xl font-bold text-primary">#{nroSerie}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "hsl(var(--badge-pending-bg))", color: "hsl(var(--badge-pending-text))" }}>Pendiente</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs font-semibold text-muted-foreground uppercase">Locatario</p><p className="font-medium">{form.locatario}</p></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase">Vencimiento</p><p className="font-medium">{fmtDate(form.vencimiento)}</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-muted-foreground uppercase">Propiedad</p><p className="font-medium">{form.propiedad}</p></div>
              <div className="col-span-2"><p className="text-xs font-semibold text-muted-foreground uppercase">Período</p><p className="font-medium">{fmtDate(form.periodoDesde)} → {fmtDate(form.periodoHasta)}</p></div>
            </div>
            <div className="bg-secondary rounded-lg p-4 space-y-1.5">
              {conceptosConMonto.map((c) => (
                <div key={c.key} className="flex justify-between">
                  <span className="text-sm">{c.label}</span>
                  <span className="font-semibold">${c.monto.toLocaleString("es-AR")}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-sm font-bold">Total</span>
                <span className="font-bold">${total.toLocaleString("es-AR")}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Printer className="w-4 h-4" />Imprimir / Guardar PDF
              </button>
              <button onClick={() => { setGenerado(false); setNroSerie(""); }} className="px-5 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">
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

      <form
        onSubmit={(e) => { e.preventDefault(); guardarRecibo.mutate(); }}
        className="bg-card rounded-xl border border-border p-6 space-y-5"
      >
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
                onFocus={() => setLocDropOpen(true)}
                onBlur={() => setTimeout(() => setLocDropOpen(false), 150)}
                onChange={(e) => {
                  setLocSearch(e.target.value);
                  setLocDropOpen(true);
                  if (e.target.value === "") setForm((p) => ({ ...p, locatario_id: "", locatario: "", propiedad: "", locador: "" }));
                }}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
            </div>
            {locDropOpen && filteredLocatarios.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredLocatarios.map((l) => {
                  const lp = l.locatario_propiedades[0];
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onMouseDown={() => handleSelectLocatario(l)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-foreground">{l.nombre}</span>
                      {lp?.monto_base ? <span className="text-xs text-muted-foreground">${Number(lp.monto_base).toLocaleString("es-AR")}/mes</span> : null}
                    </button>
                  );
                })}
              </div>
            )}
            <input type="text" name="locatario" value={form.locatario} readOnly required className="sr-only" tabIndex={-1} />
          </div>

          {propiedadesDisponibles.length > 1 && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Propiedad *</label>
              <select
                value={form.propiedad}
                onChange={(e) => handlePropChange(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Seleccionar propiedad...</option>
                {propiedadesDisponibles.map((lp) => (
                  <option key={lp.propiedad_id} value={lp.propiedades?.direccion ?? ""}>
                    {lp.propiedades?.direccion ?? ""}
                  </option>
                ))}
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
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Período Desde *</label>
            <input name="periodoDesde" type="date" value={form.periodoDesde} onChange={(e) => setForm((p) => ({ ...p, periodoDesde: e.target.value }))} required className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Período Hasta *</label>
            <input name="periodoHasta" type="date" value={form.periodoHasta} onChange={(e) => setForm((p) => ({ ...p, periodoHasta: e.target.value }))} required className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Fecha de Vencimiento</label>
            <input name="vencimiento" type="date" value={form.vencimiento} onChange={(e) => setForm((p) => ({ ...p, vencimiento: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Conceptos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conceptos *</label>
          </div>
          <div className="space-y-2">
            {conceptos.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-36 flex-shrink-0">{c.label}</span>
                <input
                  type="number"
                  min={0}
                  value={c.monto || ""}
                  onChange={(e) => updateMonto(c.key, Number(e.target.value))}
                  placeholder="0"
                  className="flex-1 px-3 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
                {c.key !== "alquiler" && (
                  <button type="button" onClick={() => removeConcepto(c.key)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add concept buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {CONCEPTOS_BASE.filter((cb) => !conceptos.find((c) => c.key === cb.key)).map((cb) => (
              <button
                key={cb.key}
                type="button"
                onClick={() => addConcepto(cb.key, cb.label)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary text-muted-foreground transition-colors"
              >
                <Plus className="w-3 h-3" /> {cb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        {total > 0 && (
          <div className="bg-secondary rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total a cobrar</span>
            <span className="text-lg font-bold text-foreground">${total.toLocaleString("es-AR")}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={guardarRecibo.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {guardarRecibo.isPending ? "Guardando..." : "Generar Recibo"}
          </button>
        </div>
      </form>
    </div>
  );
}
