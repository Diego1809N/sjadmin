import { useState, useMemo } from "react";
import { Trash2, Download, Check, X, Search } from "lucide-react";

type Recibo = {
  id: number;
  nroSerie: string;
  fecha: string;
  locatario: string;
  locador: string;
  propiedad: string;
  monto: number;
  expensas: number;
  periodoDesde: string;
  periodoHasta: string;
  vencimiento: string;
  concepto: string;
  estado: string;
  fechaEntrega: string;
  iniciales: string;
};

const now = new Date();

// Helper: format "dd/mm/yyyy" or "dd Mon yyyy" display strings
function fmtDate(val: string) {
  if (!val) return "—";
  // already dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-");
    return `${d}/${m}/${y}`;
  }
  // "24 Oct 2024" → parse and format
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return val;
}

const initialRecibos: Recibo[] = [
  { id: 1, nroSerie: "2024-0089", fecha: "24/10/2024", locatario: "Laura Pérez", locador: "Carlos Martínez", propiedad: "Dpto 4B, Sunset Heights", monto: 85000, expensas: 5000, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "24/10/2024", iniciales: "LP" },
  { id: 2, nroSerie: "2024-0090", fecha: "23/10/2024", locatario: "Diego Silva", locador: "Ana López", propiedad: "Local 12, Park View", monto: 120000, expensas: 0, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Pendiente", fechaEntrega: "", iniciales: "DS" },
  { id: 3, nroSerie: "2024-0091", fecha: "23/10/2024", locatario: "Sofía Torres", locador: "Roberto Fernández", propiedad: "Villa 7, Green Valley", monto: 95000, expensas: 3000, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "23/10/2024", iniciales: "ST" },
  { id: 4, nroSerie: "2024-0088", fecha: "22/10/2024", locatario: "Martín Castro", locador: "María González", propiedad: "Dpto 101, City Center", monto: 75000, expensas: 0, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "22/10/2024", iniciales: "MC" },
  { id: 5, nroSerie: "2024-0087", fecha: "21/10/2024", locatario: "Valentina Ruiz", locador: "Jorge Ramírez", propiedad: "Estudio 4, East Side", monto: 65000, expensas: 2500, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Pendiente", fechaEntrega: "", iniciales: "VR" },
  { id: 6, nroSerie: "2024-0086", fecha: "24/09/2024", locatario: "Laura Pérez", locador: "Carlos Martínez", propiedad: "Dpto 4B, Sunset Heights", monto: 82000, expensas: 5000, periodoDesde: "01/09/2024", periodoHasta: "30/09/2024", vencimiento: "05/09/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "24/09/2024", iniciales: "LP" },
  { id: 7, nroSerie: "2024-0085", fecha: "23/09/2024", locatario: "Diego Silva", locador: "Ana López", propiedad: "Local 12, Park View", monto: 115000, expensas: 0, periodoDesde: "01/09/2024", periodoHasta: "30/09/2024", vencimiento: "05/09/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "25/09/2024", iniciales: "DS" },
];

const getMonthLabel = (offsetFromNow: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() + offsetFromNow, 1);
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

const months = [
  { label: getMonthLabel(-1), offset: -1 },
  { label: getMonthLabel(0), offset: 0 },
];

// Cut line component
const CutLine = () => (
  <div style={{ width: "190mm", borderTop: "1.5px dashed #aaa", position: "relative", margin: "0" }}>
    <span style={{
      position: "absolute", left: "50%", top: "-9px",
      transform: "translateX(-50%)", fontSize: "9px", color: "#aaa",
      background: "white", padding: "0 6px", letterSpacing: "2px",
    }}>✂ - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
  </div>
);

function ReciboImprimible({ recibo }: { recibo: Recibo }) {
  const total = recibo.monto + recibo.expensas;

  // Derive month/year from recibo.fecha (dd/mm/yyyy)
  const fechaParts = recibo.fecha.split("/");
  let mesNum = "??", anioNum = "????", mesLabel = "";
  if (fechaParts.length === 3) {
    mesNum = fechaParts[1];
    anioNum = fechaParts[2];
    const d = new Date(Number(fechaParts[2]), Number(fechaParts[1]) - 1, 1);
    mesLabel = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  }
  const fechaConDiaBlanco = `__/${mesNum}/${anioNum}`;

  const halfContent = (tipo: "ORIGINAL" | "COPIA") => (
    <div style={{
      width: "210mm", height: "65mm", padding: "4mm 10mm",
      boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "11px",
      background: "white", display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid #333", paddingBottom: "4px" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>Recibo de Alquiler</div>
          <div style={{ color: "#666", fontSize: "9px" }}>Nº {recibo.nroSerie}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "9px", color: "#666", textAlign: "right" }}>
            <span style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>Fecha de pago</span><br />
            <strong style={{ fontSize: "12px", color: "#222" }}>{fechaConDiaBlanco}</strong>
            <span style={{ display: "block", fontSize: "8px", textTransform: "capitalize", color: "#888" }}>{mesLabel}</span>
          </div>
          <div style={{ background: tipo === "ORIGINAL" ? "#1a1a2e" : "#e2e8f0", color: tipo === "ORIGINAL" ? "white" : "#333", padding: "4px 14px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" }}>
            {tipo}
          </div>
        </div>
      </div>
      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr", gap: "5px 12px", flex: 1, alignContent: "start", paddingTop: "5px" }}>
        <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Locatario</span><br /><strong style={{ fontSize: "11px" }}>{recibo.locatario}</strong></div>
        <div style={{ gridColumn: "span 2" }}><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Propiedad</span><br /><strong style={{ fontSize: "11px" }}>{recibo.propiedad}</strong></div>
        <div><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Vencimiento</span><br /><strong style={{ fontSize: "11px" }}>{fmtDate(recibo.vencimiento)}</strong></div>
        <div style={{ gridColumn: "span 2" }}><span style={{ color: "#666", fontSize: "8px", textTransform: "uppercase" }}>Período</span><br /><strong style={{ fontSize: "11px" }}>{fmtDate(recibo.periodoDesde)} al {fmtDate(recibo.periodoHasta)}</strong></div>
      </div>
      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1.5px solid #333", paddingTop: "5px" }}>
        <div style={{ background: "#f4f4f4", borderRadius: "4px", padding: "4px 10px", flex: 1, marginRight: "10mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "10px" }}>{recibo.concepto}</span><strong style={{ fontSize: "10px" }}>${recibo.monto.toLocaleString("es-AR")}</strong></div>
          {recibo.expensas > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "10px" }}>Expensas</span><strong style={{ fontSize: "10px" }}>${recibo.expensas.toLocaleString("es-AR")}</strong></div>}
        </div>
        <strong style={{ fontSize: "14px", whiteSpace: "nowrap" }}>TOTAL: ${total.toLocaleString("es-AR")}</strong>
        <div style={{ textAlign: "right", fontSize: "8px", color: "#666", marginLeft: "10mm" }}>
          <div>Firma:</div>
          <div style={{ borderBottom: "1px solid #333", width: "70px", marginTop: "12px" }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div id={`recibo-print-${recibo.id}`} style={{ width: "190mm", background: "white" }}>
      {halfContent("ORIGINAL")}
      <CutLine />
      {halfContent("COPIA")}
      <CutLine />
    </div>
  );
}

export default function RecibosGenerados() {
  const [recibos, setRecibos] = useState<Recibo[]>(initialRecibos);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFecha, setEditFecha] = useState("");
  const [printRecibo, setPrintRecibo] = useState<Recibo | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = recibos;
    if (selectedMonth !== null) {
      const target = new Date(now.getFullYear(), now.getMonth() + selectedMonth, 1);
      result = result.filter((r) => {
        // fecha is dd/mm/yyyy
        const parts = r.fecha.split("/");
        if (parts.length === 3) {
          const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
        }
        return false;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.locatario.toLowerCase().includes(q) ||
          r.propiedad.toLowerCase().includes(q) ||
          r.nroSerie.toLowerCase().includes(q)
      );
    }
    return result;
  }, [recibos, selectedMonth, search]);

  const handleToggleEntregado = (r: Recibo) => {
    if (r.estado === "Pendiente") {
      setEditingId(r.id);
      setEditFecha(new Date().toISOString().split("T")[0]);
    } else {
      setRecibos((prev) => prev.map((x) => x.id === r.id ? { ...x, estado: "Pendiente", fechaEntrega: "" } : x));
    }
  };

  const confirmEntrega = (id: number) => {
    const [y, m, d] = editFecha.split("-");
    const formatted = `${d}/${m}/${y}`;
    setRecibos((prev) => prev.map((x) => x.id === id ? { ...x, estado: "Entregado", fechaEntrega: formatted } : x));
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    setRecibos((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePrint = (r: Recibo) => {
    setPrintRecibo(r);
    const safeName = r.locatario.replace(/\s+/g, "_");
    const today = fmtDate(r.fecha).replace(/\//g, "-");
    const originalTitle = document.title;
    document.title = `${safeName}_${today}`;
    setTimeout(() => {
      window.print();
      setPrintRecibo(null);
      document.title = originalTitle;
    }, 200);
  };

  return (
    <>
      {printRecibo && (
        <div className="print-only">
          <ReciboImprimible recibo={printRecibo} />
        </div>
      )}

      <div className="p-6 space-y-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recibos Generados</h1>
          <p className="text-sm text-muted-foreground">Últimos 2 meses — {filtered.length} recibos</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Month filter tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedMonth(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedMonth === null ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
            >
              Todos
            </button>
            {months.map((m) => (
              <button
                key={m.offset}
                onClick={() => setSelectedMonth(m.offset)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${selectedMonth === m.offset ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar locatario, propiedad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground w-64"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nº Serie</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locatario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Propiedad</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Monto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-muted-foreground">#{r.nroSerie}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{fmtDate(r.fecha)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">{r.iniciales}</div>
                      <span className="text-sm font-medium text-foreground">{r.locatario}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{r.propiedad}</td>
                  <td className="px-5 py-3 text-sm font-medium text-foreground hidden sm:table-cell">
                    ${(r.monto + r.expensas).toLocaleString("es-AR")}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === r.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={editFecha}
                          onChange={(e) => setEditFecha(e.target.value)}
                          className="text-xs px-2 py-1 bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                        <button onClick={() => confirmEntrega(r.id)} className="p-1 rounded bg-[hsl(var(--badge-delivered-bg))] text-[hsl(var(--badge-delivered-text))]"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded bg-secondary text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div>
                        <span
                          className="text-xs font-semibold px-3 py-1 rounded-full cursor-pointer select-none"
                          style={r.estado === "Entregado"
                            ? { background: "hsl(var(--badge-delivered-bg))", color: "hsl(var(--badge-delivered-text))" }
                            : { background: "hsl(var(--badge-pending-bg))", color: "hsl(var(--badge-pending-text))" }}
                          onClick={() => handleToggleEntregado(r)}
                          title="Click para cambiar estado"
                        >
                          {r.estado}
                        </span>
                        {r.estado === "Entregado" && r.fechaEntrega && (
                          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(r.fechaEntrega)}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePrint(r)}
                        title="Descargar / Imprimir"
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        title="Eliminar recibo"
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No hay recibos para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
