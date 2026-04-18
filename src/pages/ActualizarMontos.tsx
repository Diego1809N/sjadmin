import { ExternalLink, Camera, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActualizarMontos() {
  const calculadoraUrl = "https://arquiler.com/mini?theme=light&backgroundColor=ffffff";
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Actualizar Montos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calculadora de alquileres para actualizar los montos según el índice correspondiente.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>
                Para descargar una captura del cálculo, abrí la calculadora en una pestaña nueva y usá la captura nativa del sistema:{" "}
                <strong className="text-foreground">
                  {isMac ? "Cmd + Shift + 4" : "Win + Shift + S"}
                </strong>
                .
              </span>
            </div>
            <Button
              onClick={() => window.open(calculadoraUrl, "_blank", "noopener,noreferrer")}
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir y capturar
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-[800px] aspect-[4/3]">
              <iframe
                title="Calculadora de alquileres"
                src={calculadoraUrl}
                className="w-full h-full rounded-md border border-border"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
