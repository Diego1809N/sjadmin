import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function ActualizarMontos() {
  const [loaded, setLoaded] = useState(false);

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
          <div className="flex justify-center">
            <div className="relative w-full max-w-[800px] aspect-[4/3] bg-background rounded-md overflow-hidden border border-border">
              {!loaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando calculadora...</p>
                </div>
              )}
              <iframe
                title="Calculadora de alquileres"
                src="https://arquiler.com/mini?theme=light&backgroundColor=ffffff"
                className="w-full h-full"
                style={{ backgroundColor: "hsl(var(--background))" }}
                onLoad={() => setLoaded(true)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
