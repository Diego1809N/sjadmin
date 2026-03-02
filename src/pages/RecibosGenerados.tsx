import { useState, useMemo } from "react";
import { Trash2, Download, Check, X } from "lucide-react";

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

const initialRecibos: Recibo[] = [
  { id: 1, nroSerie: "2024-0089", fecha: "24 Oct 2024", locatario: "Laura Pérez", locador: "Carlos Martínez", propiedad: "Dpto 4B, Sunset Heights", monto: 85000, expensas: 5000, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "24 Oct 2024", iniciales: "LP" },
  { id: 2, nroSerie: "2024-0090", fecha: "23 Oct 2024", locatario: "Diego Silva", locador: "Ana López", propiedad: "Local 12, Park View", monto: 120000, expensas: 0, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Pendiente", fechaEntrega: "", iniciales: "DS" },
  { id: 3, nroSerie: "2024-0091", fecha: "23 Oct 2024", locatario: "Sofía Torres", locador: "Roberto Fernández", propiedad: "Villa 7, Green Valley", monto: 95000, expensas: 3000, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "23 Oct 2024", iniciales: "ST" },
  { id: 4, nroSerie: "2024-0088", fecha: "22 Oct 2024", locatario: "Martín Castro", locador: "María González", propiedad: "Dpto 101, City Center", monto: 75000, expensas: 0, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "22 Oct 2024", iniciales: "MC" },
  { id: 5, nroSerie: "2024-0087", fecha: "21 Oct 2024", locatario: "Valentina Ruiz", locador: "Jorge Ramírez", propiedad: "Estudio 4, East Side", monto: 65000, expensas: 2500, periodoDesde: "01/10/2024", periodoHasta: "31/10/2024", vencimiento: "05/10/2024", concepto: "Alquiler mensual", estado: "Pendiente", fechaEntrega: "", iniciales: "VR" },
  { id: 6, nroSerie: "2024-0086", fecha: "24 Sep 2024", locatario: "Laura Pérez", locador: "Carlos Martínez", propiedad: "Dpto 4B, Sunset Heights", monto: 82000, expensas: 5000, periodoDesde: "01/09/2024", periodoHasta: "30/09/2024", vencimiento: "05/09/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "24 Sep 2024", iniciales: "LP" },
  { id: 7, nroSerie: "2024-0085", fecha: "23 Sep 2024", locatario: "Diego Silva", locador: "Ana López", propiedad: "Local 12, Park View", monto: 115000, expensas: 0, periodoDesde: "01/09/2024", periodoHasta: "30/09/2024", vencimiento: "05/09/2024", concepto: "Alquiler mensual", estado: "Entregado", fechaEntrega: "25 Sep 2024", iniciales: "DS" },
];

// Month labels for filter tabs
const getMonthLabel = (offsetFromNow: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() + offsetFromNow, 1);
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

const months = [
  { label: getMonthLabel(-1), offset: -1 },
  { label: getMonthLabel(0), offset: 0 },
];

function ReciboImprimible({ recibo }: { recibo: Recibo }) {
  const total = recibo.monto + recibo.expensas;
  const halfContent = (tipo: "ORIGINAL" | "COPIA") => (
    <div style={{ width: "100%", padding: "14px 18px", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #333", paddingBottom: "8px", marginBottom: "10px" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>Recibo de Alquiler</div>
          <div style={{ color: "#666", fontSize: "10px" }}>Nº {recibo.nroSerie}</div>
        </div>
        <div style={{ background: tipo === "ORIGINAL" ? "#1a1a2e" : "#e2e8f0", color: tipo === "ORIGINAL" ? "white" : "#333", padding: "4px 12px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" }}>
          {tipo}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px", marginBottom: "10px" }}>
        <div><span style={{ color: "#666", fontSize: "9px", textTransform: "uppercase" }}>Locatario</span><br /><strong>{recibo.locatario}</strong></div>
        <div><span style={{ color: "#666", fontSize: "9px", textTransform: "uppercase" }}>Locador</span><br /><strong>{recibo.locador}</strong></div>
        <div style={{ gridColumn: "span 2" }}><span style={{ color: "#666", fontSize: "9px", textTransform: "uppercase" }}>Propiedad</span><br /><strong>{recibo.propiedad}</strong></div>
        <div><span style={{ color: "#666", fontSize: "9px", textTransform: "uppercase" }}>Período</span><br /><strong>{recibo.periodoDesde} → {recibo.periodoHasta}</strong></div>
        <div><span style={{ color: "#666", fontSize: "9px", textTransform: "uppercase" }}>Vencimiento</span><br /><strong>{recibo.vencimiento || "—"}</strong></div>
      </div>
      <div style={{ background: "#f8f8f8", borderRadius: "6px", padding: "8px 10px", marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>{recibo.concepto}</span><strong>${recibo.monto.toLocaleString("es-AR")}</strong></div>
        {recibo.expensas > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}><span>Expensas</span><strong>${recibo.expensas.toLocaleString("es-AR")}</strong></div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #333", paddingTop: "8px" }}>
        <strong style={{ fontSize: "14px" }}>TOTAL: ${total.toLocaleString("es-AR")}</strong>
        <div style={{ textAlign: "right", fontSize: "9px", color: "#666" }}>
          <div>Firma:</div>
          <div style={{ borderBottom: "1px solid #333", width: "80px", marginTop: "16px" }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div id={`recibo-print-${recibo.id}`} style={{ display: "flex", flexDirection: "column", width: "210mm", background: "white", pageBreakInside: "avoid" }}>
      {/* ORIGINAL - top half */}
      <div style={{ borderBottom: "1px dashed #ccc", paddingBottom: "4px" }}>
        {halfContent("ORIGINAL")}
      </div>
      {/* COPIA - bottom half */}
      <div style={{ paddingTop: "4px" }}>
        {halfContent("COPIA")}
      </div>
    </div>
  );
}

export default function RecibosGenerados() {
  const [recibos, setRecibos] = useState<Recibo[]>(initialRecibos);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFecha, setEditFecha] = useState("");
  const [printRecibo, setPrintRecibo] = useState<Recibo | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = all

  const filtered = useMemo(() => {
    if (selectedMonth === null) return recibos;
    const target = new Date(now.getFullYear(), now.getMonth() + selectedMonth, 1);
    return recibos.filter((r) => {
      // parse fecha like "24 Oct 2024"
      const d = new Date(r.fecha);
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
    });
  }, [recibos, selectedMonth]);

  const handleToggleEntregado = (r: Recibo) => {
    if (r.estado === "Pendiente") {
      setEditingId(r.id);
      setEditFecha(new Date().toISOString().split("T")[0]);
    } else {
      setRecibos((prev) => prev.map((x) => x.id === r.id ? { ...x, estado: "Pendiente", fechaEntrega: "" } : x));
    }
  };

  const confirmEntrega = (id: number) => {
    const formatted = new Date(editFecha + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
    setRecibos((prev) => prev.map((x) => x.id === id ? { ...x, estado: "Entregado", fechaEntrega: formatted } : x));
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    setRecibos((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePrint = (r: Recibo) => {
    setPrintRecibo(r);
    setTimeout(() => {
      window.print();
      setPrintRecibo(null);
    }, 200);
  };

  return (
    <>
      {/* Print area - only shows on print */}
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
                  <td className="px-5 py-3 text-sm text-muted-foreground">{r.fecha}</td>
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
                          <p className="text-xs text-muted-foreground mt-0.5">{r.fechaEntrega}</p>
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
