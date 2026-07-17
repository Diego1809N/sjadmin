// Helpers para el cálculo de períodos de ajuste de alquiler.
// Se comparten entre Locatarios (edición) y Aprobaciones (aplicación).

export function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(s);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function getPeriodos(fechaInicio: string, fechaFin: string | null, intervalo: number): Date[] {
  if (!fechaInicio || !intervalo) return [];
  const start = parseLocalDate(fechaInicio);
  if (!start) return [];
  let totalMonths = 12;
  const end = parseLocalDate(fechaFin);
  if (end) {
    totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }
  const n = Math.max(1, Math.ceil(totalMonths / intervalo));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i * intervalo);
    return d;
  });
}

export function getCurrentPeriodoIdx(periodos: Date[]): number {
  if (periodos.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let idx = 0;
  for (let i = 0; i < periodos.length; i++) {
    const p = new Date(periodos[i]);
    p.setHours(0, 0, 0, 0);
    if (p.getTime() <= today.getTime()) idx = i;
    else break;
  }
  return idx;
}

export function getPeriodoIdxByDate(periodos: Date[], fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const iso = toLocalISO(parseLocalDate(fecha) ?? new Date(fecha));
  const idx = periodos.findIndex((p) => toLocalISO(p) === iso);
  return idx >= 0 ? idx : null;
}
