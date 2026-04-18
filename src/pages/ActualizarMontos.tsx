export default function ActualizarMontos() {
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
            <div className="w-full max-w-[800px] aspect-[4/3]">
              <iframe
                title="Calculadora de alquileres"
                src="https://arquiler.com/mini?theme=light&backgroundColor=ffffff"
                className="w-full h-full rounded-md border border-border"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
