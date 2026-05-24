import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Download, Trash2, Plus, Eye } from "lucide-react";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
} from "docx";
import { saveAs } from "file-saver";

const TIPOS = [
  { value: "vivienda", label: "Vivienda" },
  { value: "comercial", label: "Comercial" },
  { value: "temporario", label: "Temporario" },
  { value: "garage", label: "Garage / Cochera" },
  { value: "otro", label: "Otro" },
];

const INDICES = ["ICL", "IPC", "Casa Propia", "Acuerdo entre partes", "Sin ajuste"];

interface Contrato {
  id: string;
  tipo: string;
  locador_nombre: string;
  locador_dni: string | null;
  locador_domicilio: string | null;
  locatario_nombre: string;
  locatario_dni: string | null;
  locatario_domicilio: string | null;
  propiedad_direccion: string;
  propiedad_descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  plazo_meses: number | null;
  monto: number;
  deposito: number | null;
  indice_ajuste: string | null;
  intervalo_ajuste_meses: number | null;
  garantias: string | null;
  destino: string | null;
  observaciones: string | null;
  created_at: string;
}

const emptyForm = {
  tipo: "vivienda",
  locador_nombre: "", locador_dni: "", locador_domicilio: "",
  locatario_nombre: "", locatario_dni: "", locatario_domicilio: "",
  propiedad_direccion: "", propiedad_descripcion: "",
  fecha_inicio: "", fecha_fin: "",
  plazo_meses: 36,
  monto: 0, deposito: 0,
  indice_ajuste: "ICL", intervalo_ajuste_meses: 6,
  garantias: "", destino: "", observaciones: "",
};

function formatDateAR(d: string | null) {
  if (!d) return "____________";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n || 0);
}

function numToText(n: number): string {
  // Simple fallback - just format with commas
  return fmtMoney(n);
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Error al cargar contratos");
    else setContratos((data as Contrato[]) || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  // Auto-calc fecha_fin desde fecha_inicio + plazo_meses
  useEffect(() => {
    if (form.fecha_inicio && form.plazo_meses) {
      const d = new Date(form.fecha_inicio);
      d.setMonth(d.getMonth() + Number(form.plazo_meses));
      d.setDate(d.getDate() - 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setForm(f => ({ ...f, fecha_fin: `${yyyy}-${mm}-${dd}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha_inicio, form.plazo_meses]);

  const handleSave = async () => {
    if (!form.locador_nombre || !form.locatario_nombre || !form.propiedad_direccion) {
      toast.error("Completá locador, locatario y dirección de la propiedad");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      plazo_meses: Number(form.plazo_meses) || null,
      intervalo_ajuste_meses: Number(form.intervalo_ajuste_meses) || null,
      monto: Number(form.monto) || 0,
      deposito: Number(form.deposito) || 0,
    };
    const { data, error } = await supabase.from("contratos").insert(payload).select().single();
    setSaving(false);
    if (error) {
      toast.error("Error al guardar el contrato");
      return;
    }
    toast.success("Contrato guardado");
    setOpenForm(false);
    setForm(emptyForm);
    cargar();
    if (data) generarWord(data as Contrato);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este contrato?")) return;
    const { error } = await supabase.from("contratos").delete().eq("id", id);
    if (error) toast.error("Error al eliminar");
    else { toast.success("Contrato eliminado"); cargar(); }
  };

  const generarWord = (c: Contrato) => {
    const tipoLabel = TIPOS.find(t => t.value === c.tipo)?.label || c.tipo;

    const P = (text: string, opts: { bold?: boolean; align?: any; size?: number; spacing?: number } = {}) =>
      new Paragraph({
        alignment: opts.align,
        spacing: { after: opts.spacing ?? 120 },
        children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, font: "Arial" })],
      });

    const PMix = (runs: { text: string; bold?: boolean }[]) =>
      new Paragraph({
        spacing: { after: 120 },
        alignment: AlignmentType.JUSTIFIED,
        children: runs.map(r => new TextRun({ text: r.text, bold: r.bold, size: 22, font: "Arial" })),
      });

    const clauses: Paragraph[] = [
      P(`CONTRATO DE LOCACIÓN — ${tipoLabel.toUpperCase()}`, {
        bold: true, align: AlignmentType.CENTER, size: 28, spacing: 300,
      }),
      PMix([
        { text: "Entre " },
        { text: c.locador_nombre, bold: true },
        { text: c.locador_dni ? `, DNI N° ${c.locador_dni}` : "" },
        { text: c.locador_domicilio ? `, con domicilio en ${c.locador_domicilio}` : "" },
        { text: ", en adelante " },
        { text: "EL LOCADOR", bold: true },
        { text: ", por una parte; y por la otra " },
        { text: c.locatario_nombre, bold: true },
        { text: c.locatario_dni ? `, DNI N° ${c.locatario_dni}` : "" },
        { text: c.locatario_domicilio ? `, con domicilio en ${c.locatario_domicilio}` : "" },
        { text: ", en adelante " },
        { text: "EL LOCATARIO", bold: true },
        { text: ", convienen en celebrar el presente contrato de locación, sujeto a las siguientes cláusulas:" },
      ]),

      P("PRIMERA — OBJETO", { bold: true, spacing: 120 }),
      PMix([
        { text: "EL LOCADOR da en locación a EL LOCATARIO, quien acepta de plena conformidad, el inmueble ubicado en " },
        { text: c.propiedad_direccion, bold: true },
        { text: c.propiedad_descripcion ? `. ${c.propiedad_descripcion}` : "." },
      ]),

      P("SEGUNDA — DESTINO", { bold: true, spacing: 120 }),
      PMix([
        { text: "El inmueble será destinado exclusivamente a " },
        { text: c.destino || (c.tipo === "comercial" ? "uso comercial" : "vivienda familiar del locatario"), bold: true },
        { text: ", no pudiendo darle otro destino sin previa autorización por escrito del LOCADOR." },
      ]),

      P("TERCERA — PLAZO", { bold: true, spacing: 120 }),
      PMix([
        { text: `El plazo de la locación se conviene en ${c.plazo_meses || "____"} meses, ` },
        { text: `comenzando el día ${formatDateAR(c.fecha_inicio)} y finalizando el día ${formatDateAR(c.fecha_fin)}.` },
      ]),

      P("CUARTA — PRECIO", { bold: true, spacing: 120 }),
      PMix([
        { text: `El precio mensual de la locación se establece en la suma de ` },
        { text: numToText(c.monto), bold: true },
        { text: `, que EL LOCATARIO se obliga a abonar por mes adelantado, del 1° al 10 de cada mes, en el domicilio del LOCADOR o donde éste indique.` },
      ]),

      P("QUINTA — ACTUALIZACIÓN", { bold: true, spacing: 120 }),
      PMix([
        { text: c.indice_ajuste && c.indice_ajuste !== "Sin ajuste"
          ? `El monto del alquiler se ajustará cada ${c.intervalo_ajuste_meses || 6} meses conforme al índice ${c.indice_ajuste}, según lo dispuesto por la legislación vigente.`
          : "Las partes acuerdan que el monto del alquiler permanecerá fijo durante toda la vigencia del contrato." },
      ]),

      P("SEXTA — DEPÓSITO EN GARANTÍA", { bold: true, spacing: 120 }),
      PMix([
        { text: `EL LOCATARIO entrega en este acto, en concepto de depósito en garantía, la suma de ` },
        { text: numToText(c.deposito || 0), bold: true },
        { text: `, la que será reintegrada al finalizar el contrato, una vez verificado el buen estado del inmueble y abonados todos los servicios e impuestos a cargo del locatario.` },
      ]),

      P("SÉPTIMA — GARANTÍAS", { bold: true, spacing: 120 }),
      PMix([
        { text: c.garantias || "EL LOCATARIO ofrece como garantía las que se acompañan al presente contrato y son aceptadas de conformidad por EL LOCADOR." },
      ]),

      P("OCTAVA — SERVICIOS E IMPUESTOS", { bold: true, spacing: 120 }),
      PMix([
        { text: "Estarán a cargo de EL LOCATARIO los servicios de luz, gas, agua, teléfono, internet, expensas ordinarias y todo otro servicio que se contrate sobre el inmueble. Los impuestos y tasas que graven el inmueble (ABL, inmobiliario) estarán a cargo de EL LOCADOR, salvo expensas extraordinarias." },
      ]),

      P("NOVENA — CONSERVACIÓN", { bold: true, spacing: 120 }),
      PMix([
        { text: "EL LOCATARIO recibe el inmueble en perfecto estado de conservación y se obliga a mantenerlo y restituirlo en idéntico estado, salvo el desgaste natural por el uso. No podrá realizar modificaciones sin autorización escrita del LOCADOR." },
      ]),

      P("DÉCIMA — PROHIBICIONES", { bold: true, spacing: 120 }),
      PMix([
        { text: "Queda expresamente prohibido subarrendar, ceder o transferir el presente contrato, total o parcialmente, sin el consentimiento expreso y por escrito del LOCADOR." },
      ]),

      P("DÉCIMO PRIMERA — RESCISIÓN", { bold: true, spacing: 120 }),
      PMix([
        { text: "Las partes podrán rescindir el contrato conforme a lo dispuesto por la Ley de Alquileres vigente, debiendo notificar fehacientemente con la antelación legal correspondiente." },
      ]),

      P("DÉCIMO SEGUNDA — JURISDICCIÓN", { bold: true, spacing: 120 }),
      PMix([
        { text: "Para todos los efectos legales del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios competentes del domicilio del inmueble locado, renunciando a cualquier otro fuero o jurisdicción." },
      ]),

      ...(c.observaciones ? [
        P("DÉCIMO TERCERA — OBSERVACIONES", { bold: true, spacing: 120 }),
        PMix([{ text: c.observaciones }]),
      ] : []),

      P("", { spacing: 300 }),
      PMix([
        { text: `En prueba de conformidad, se firman dos ejemplares de un mismo tenor y a un solo efecto, en el lugar y fecha indicados al pie.` },
      ]),
      P("", { spacing: 600 }),
      P("____________________________                    ____________________________", { align: AlignmentType.CENTER, spacing: 80 }),
      P(`         EL LOCADOR                                              EL LOCATARIO`, { align: AlignmentType.CENTER, spacing: 80 }),
      P(`${c.locador_nombre}                                              ${c.locatario_nombre}`, { align: AlignmentType.CENTER }),
    ];

    const doc = new Document({
      styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: clauses,
      }],
    });

    Packer.toBlob(doc).then(blob => {
      const fname = `Contrato_${c.locatario_nombre.replace(/\s+/g, "_")}_${c.id.slice(0, 6)}.docx`;
      saveAs(blob, fname);
      toast.success("Contrato descargado");
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-sm text-muted-foreground">Generación de contratos de locación en Word</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpenForm(true); }}>
          <Plus className="w-4 h-4" /> Nuevo contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : contratos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aún no hay contratos generados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Locador</TableHead>
                  <TableHead>Locatario</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDateAR(c.created_at.split("T")[0])}</TableCell>
                    <TableCell className="capitalize">{TIPOS.find(t => t.value === c.tipo)?.label}</TableCell>
                    <TableCell>{c.locador_nombre}</TableCell>
                    <TableCell>{c.locatario_nombre}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.propiedad_direccion}</TableCell>
                    <TableCell>{fmtMoney(c.monto)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => generarWord(c)}>
                        <Download className="w-4 h-4" /> Word
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo contrato</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label>Tipo de contrato</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Locador</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Nombre completo *</Label><Input value={form.locador_nombre} onChange={e => setForm({ ...form, locador_nombre: e.target.value })} /></div>
                <div><Label>DNI / CUIT</Label><Input value={form.locador_dni} onChange={e => setForm({ ...form, locador_dni: e.target.value })} /></div>
                <div><Label>Domicilio</Label><Input value={form.locador_domicilio} onChange={e => setForm({ ...form, locador_domicilio: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Locatario</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Nombre completo *</Label><Input value={form.locatario_nombre} onChange={e => setForm({ ...form, locatario_nombre: e.target.value })} /></div>
                <div><Label>DNI / CUIT</Label><Input value={form.locatario_dni} onChange={e => setForm({ ...form, locatario_dni: e.target.value })} /></div>
                <div><Label>Domicilio</Label><Input value={form.locatario_domicilio} onChange={e => setForm({ ...form, locatario_domicilio: e.target.value })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Propiedad</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Dirección *</Label><Input value={form.propiedad_direccion} onChange={e => setForm({ ...form, propiedad_direccion: e.target.value })} /></div>
                <div><Label>Descripción (cantidad de ambientes, características)</Label>
                  <Textarea rows={2} value={form.propiedad_descripcion} onChange={e => setForm({ ...form, propiedad_descripcion: e.target.value })} />
                </div>
                <div><Label>Destino</Label>
                  <Input placeholder="Ej: vivienda familiar / local comercial rubro X" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Plazo y precio</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div><Label>Plazo (meses)</Label><Input type="number" value={form.plazo_meses || ""} onChange={e => setForm({ ...form, plazo_meses: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
                <div><Label>Fecha fin</Label><Input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
                <div></div>
                <div><Label>Monto mensual</Label><Input type="number" value={form.monto || ""} onChange={e => setForm({ ...form, monto: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
                <div><Label>Depósito en garantía</Label><Input type="number" value={form.deposito || ""} onChange={e => setForm({ ...form, deposito: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
                <div>
                  <Label>Índice ajuste</Label>
                  <Select value={form.indice_ajuste} onValueChange={v => setForm({ ...form, indice_ajuste: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INDICES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Cada (meses)</Label><Input type="number" value={form.intervalo_ajuste_meses || ""} onChange={e => setForm({ ...form, intervalo_ajuste_meses: e.target.value === "" ? 0 : Number(e.target.value) })} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Garantías y observaciones</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Garantías</Label>
                  <Textarea rows={2} placeholder="Ej: garantía propietaria a nombre de... / recibo de sueldo / seguro de caución" value={form.garantias} onChange={e => setForm({ ...form, garantias: e.target.value })} />
                </div>
                <div><Label>Observaciones / cláusulas adicionales</Label>
                  <Textarea rows={3} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                <FileText className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar y descargar Word"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
