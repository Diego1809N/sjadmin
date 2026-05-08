// Convierte números a letras en español (Argentina), pensado para montos en pesos.

const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const ESPECIALES = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
const DECENAS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function deceMenor100(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIALES[n - 10];
  if (n < 30) {
    if (n === 20) return "veinte";
    return "veinti" + UNIDADES[n - 20];
  }
  const d = Math.floor(n / 10);
  const u = n % 10;
  return DECENAS[d] + (u ? " y " + UNIDADES[u] : "");
}

function menor1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]);
  if (r) partes.push(deceMenor100(r));
  return partes.join(" ");
}

export function numeroALetras(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "cero pesos";

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];

  if (millones) {
    if (millones === 1) partes.push("un millón");
    else partes.push(menor1000(millones).replace(/uno$/, "un") + " millones");
  }

  if (miles) {
    if (miles === 1) partes.push("mil");
    else partes.push(menor1000(miles).replace(/uno$/, "un") + " mil");
  }

  if (resto) {
    partes.push(menor1000(resto).replace(/uno$/, "un"));
  }

  return partes.join(" ") + " pesos";
}
