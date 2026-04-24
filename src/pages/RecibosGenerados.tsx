import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Download, Check, X, Search, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Recibo = {
  id: string;
  nro_serie: string;
  fecha: string;
  locatario_nombre: string;
  locador_nombre: string | null;
  propiedad: string;
  monto: number;
  expensas: number;
  agua: number;
  luz: number;
  gas: number;
  arreglos: number;
  servicios: number;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  vencimiento: string | null;
  concepto: string | null;
  estado: string;
  fecha_entrega: string | null;
};

function fmtDate(val: string | null) {
  if (!val) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return val;
}

const now = new Date();

const getMonthLabel = (offsetFromNow: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() + offsetFromNow, 1);
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

const months = [
  { label: getMonthLabel(-1), offset: -1 },
  { label: getMonthLabel(0), offset: 0 },
];

function ReciboImprimible({ recibo }: { recibo: Recibo }) {
  const conceptosConMonto = [
    { key: "alquiler", label: "Alquiler mensual", monto: Number(recibo.monto) },
    { key: "expensas", label: "Expensas", monto: Number(recibo.expensas) },
    { key: "agua", label: "Agua", monto: Number(recibo.agua) },
    { key: "luz", label: "Luz", monto: Number(recibo.luz) },
    { key: "gas", label: "Gas", monto: Number(recibo.gas) },
    { key: "arreglos", label: "Arreglos", monto: Number(recibo.arreglos) },
    { key: "servicios", label: "Servicios", monto: Number(recibo.servicios) },
  ].filter((c) => c.monto > 0);

  const total = conceptosConMonto.reduce((s, c) => s + c.monto, 0);

  // Derive month/year from recibo.fecha
  let mesNum = "??", anioNum = "????", mesLabel = "";
  const parts = (recibo.fecha ?? "").split("-");
  if (parts.length === 3) {
    mesNum = parts[1];
    anioNum = parts[0];
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    mesLabel = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  }
  const fechaConDiaBlanco = `__/${mesNum}/${anioNum}`;

  // Each half = exactly 148.5mm (half A4)
  const halfContent = (tipo: "ORIGINAL" | "COPIA") => (
    <div style={{
      width: "210mm",
      height: "148.5mm",
      padding: "8mm 12mm",
      boxSizing: "border-box",
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      background: "white",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid #333", paddingBottom: "6px" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "19px" }}>Recibo de Alquiler</div>
          <div style={{ color: "#666", fontSize: "11px", marginTop: "2px" }}>Nº {recibo.nro_serie}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "11px", color: "#666", textAlign: "right" }}>
            <span style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>Fecha de pago</span><br />
            <strong style={{ fontSize: "15px", color: "#222" }}>{fechaConDiaBlanco}</strong>
            <span style={{ display: "block", fontSize: "10px", textTransform: "capitalize", color: "#888" }}>{mesLabel}</span>
          </div>
          <div style={{
            background: tipo === "ORIGINAL" ? "#1a1a2e" : "#e2e8f0",
            color: tipo === "ORIGINAL" ? "white" : "#333",
            padding: "5px 16px", borderRadius: "4px", fontWeight: "bold", fontSize: "13px",
          }}>
            {tipo}
          </div>
        </div>
      </div>

      {/* Info fields */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr 2fr", gap: "6px 14px", paddingTop: "8px" }}>
        <div>
          <span style={{ color: "#666", fontSize: "10px", textTransform: "uppercase" }}>Locatario</span><br />
          <strong style={{ fontSize: "14px" }}>{recibo.locatario_nombre}</strong>
        </div>
        <div>
          <span style={{ color: "#666", fontSize: "10px", textTransform: "uppercase" }}>Propiedad</span><br />
          <strong style={{ fontSize: "14px" }}>{recibo.propiedad}</strong>
        </div>
        <div>
          <span style={{ color: "#666", fontSize: "10px", textTransform: "uppercase" }}>Vencimiento</span><br />
          <strong style={{ fontSize: "14px" }}>{fmtDate(recibo.vencimiento)}</strong>
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <span style={{ color: "#666", fontSize: "10px", textTransform: "uppercase" }}>Período</span><br />
          <strong style={{ fontSize: "14px" }}>{fmtDate(recibo.periodo_desde)} al {fmtDate(recibo.periodo_hasta)}</strong>
        </div>
      </div>

      {/* Concepts table — centered vertically in the remaining space */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "8px 0" }}>
        <div style={{ background: "#f4f4f4", borderRadius: "6px", padding: "10px 20px", maxWidth: "400px", margin: "0 auto", width: "100%" }}>
          {conceptosConMonto.map((c) => (
            <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "0.5px solid #e0e0e0" }}>
              <span style={{ fontSize: "13px" }}>{c.label}</span>
              <strong style={{ fontSize: "13px" }}>${c.monto.toLocaleString("es-AR")}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: total + signature */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1.5px solid #333", paddingTop: "6px" }}>
        <strong style={{ fontSize: "18px", whiteSpace: "nowrap" }}>TOTAL: ${total.toLocaleString("es-AR")}</strong>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#666" }}>
          <div>Firma y Aclaración:</div>
          <div style={{ borderBottom: "1px solid #333", width: "120px", marginTop: "18px" }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "210mm", height: "297mm", background: "white", display: "flex", flexDirection: "column" }}>
      {halfContent("ORIGINAL")}
      <div style={{ borderTop: "1.5px dashed #aaa", position: "relative", margin: "0", flexShrink: 0 }}>
        <span style={{ position: "absolute", left: "50%", top: "-9px", transform: "translateX(-50%)", fontSize: "9px", color: "#aaa", background: "white", padding: "0 6px", letterSpacing: "2px" }}>
          ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂
        </span>
      </div>
      {halfContent("COPIA")}
    </div>
  );
}

export default function RecibosGenerados() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState("");
  const [printRecibo, setPrintRecibo] = useState<Recibo | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Recibo | null>(null);

  // ─── Query ─────────────────────────────────────────────────────────────────
  const { data: recibos = [], isLoading } = useQuery({
    queryKey: ["recibos"],
    queryFn: async () => {
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("recibos")
        .select("id, nro_serie, fecha, locatario_nombre, locador_nombre, propiedad, monto, expensas, agua, luz, gas, arreglos, servicios, periodo_desde, periodo_hasta, vencimiento, concepto, estado, fecha_entrega")
        .gte("fecha", twoMonthsAgo)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recibo[];
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const toggleEntregado = useMutation({
    mutationFn: async ({ id, estado, fechaEntrega }: { id: string; estado: string; fechaEntrega: string | null }) => {
      const { error } = await supabase.from("recibos").update({ estado, fecha_entrega: fechaEntrega }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recibos"] });
      setEditingId(null);
    },
  });

  const deleteRecibo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recibos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recibos"] }),
  });

  // ─── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = recibos;
    if (selectedMonth !== null) {
      const target = new Date(now.getFullYear(), now.getMonth() + selectedMonth, 1);
      result = result.filter((r) => {
        if (!r.fecha) return false;
        const d = new Date(r.fecha);
        return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.locatario_nombre.toLowerCase().includes(q) ||
          r.propiedad.toLowerCase().includes(q) ||
          r.nro_serie.toLowerCase().includes(q)
      );
    }
    return result;
  }, [recibos, selectedMonth, search]);

  const handleToggleEntregado = (r: Recibo) => {
    if (r.estado === "Pendiente") {
      setEditingId(r.id);
      setEditFecha(new Date().toISOString().split("T")[0]);
    } else {
      toggleEntregado.mutate({ id: r.id, estado: "Pendiente", fechaEntrega: null });
    }
  };

  const confirmEntrega = (id: string) => {
    toggleEntregado.mutate({ id, estado: "Entregado", fechaEntrega: editFecha });
  };

  const handlePrint = (r: Recibo) => {
    setPrintRecibo(r);
    const safeName = r.locatario_nombre.replace(/\s+/g, "_");
    const today = fmtDate(r.fecha).replace(/\//g, "-");
    const originalTitle = document.title;
    document.title = `${safeName}_${today}`;
    setTimeout(() => {
      window.print();
      setPrintRecibo(null);
      document.title = originalTitle;
    }, 200);
  };

  const getTotal = (r: Recibo) =>
    Number(r.monto) + Number(r.expensas) + Number(r.agua) + Number(r.luz) + Number(r.gas) + Number(r.arreglos) + Number(r.servicios);

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

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nº Serie</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locatario</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Propiedad</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground">#{r.nro_serie}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{fmtDate(r.fecha)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                          {r.locatario_nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{r.locatario_nombre}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{r.propiedad}</td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground hidden sm:table-cell">
                      ${getTotal(r).toLocaleString("es-AR")}
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
                          {r.estado === "Entregado" && r.fecha_entrega && (
                            <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(r.fecha_entrega)}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handlePrint(r)} title="Imprimir" className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => setConfirmDelete(r)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-sm text-muted-foreground text-center">No hay recibos en este período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="¿Eliminar recibo?"
        description={confirmDelete ? `Se eliminará el recibo Nº ${confirmDelete.nro_serie} de ${confirmDelete.locatario_nombre}. Esta acción no se puede deshacer.` : ""}
        onConfirm={() => { if (confirmDelete) deleteRecibo.mutate(confirmDelete.id); setConfirmDelete(null); }}
      />
    </>
  );
}
