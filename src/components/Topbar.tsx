import { Bell, Settings, Search } from "lucide-react";

interface TopbarProps {
  title: string;
  onCreateReceipt?: () => void;
}

export default function Topbar({ title, onCreateReceipt }: TopbarProps) {
  const now = new Date();
  const time = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4">
      <div className="flex-1 flex items-center gap-3">
        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder="Buscar propiedades, locatarios..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground hidden sm:block">
          Actualizado hoy a las {time}
        </span>
        <button
          onClick={onCreateReceipt}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden sm:inline">Crear Recibo</span>
        </button>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </button>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
