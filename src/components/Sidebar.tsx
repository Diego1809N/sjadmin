import { LayoutDashboard, FileText, Users, UserCheck, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
{ id: "generar-cobro", label: "Generar Cobro", icon: FileText },
{ id: "locadores", label: "Locadores", icon: UserCheck },
{ id: "locatarios", label: "Locatarios", icon: Users }];


export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () =>
  <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground leading-tight">NEGOCIOS INMOBILIARIOS</p>
          <p className="text-xs text-muted-foreground">PORTAL DE GESTIÓN</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {onNavigate(item.id);setMobileOpen(false);}}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive ?
              "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-text))]" :
              "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>

              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>);

      })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[hsl(var(--stat-orange))] flex items-center justify-center text-sm font-semibold text-[hsl(var(--stat-orange-icon))]">
            AG
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Admin General</p>
            
          </div>
        </div>
      </div>
    </div>;


  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-60 h-screen bg-[hsl(var(--card))] border-r border-sidebar-border fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg border border-border shadow"
        onClick={() => setMobileOpen(!mobileOpen)}>

        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen &&
      <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-card border-r border-sidebar-border">
            <SidebarContent />
          </aside>
        </div>
      }
    </>);

}