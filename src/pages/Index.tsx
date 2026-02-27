import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Dashboard from "@/pages/Dashboard";
import GenerarCobro from "@/pages/GenerarCobro";
import Locadores from "@/pages/Locadores";
import Locatarios from "@/pages/Locatarios";
import Login from "@/pages/Login";

export default function Index() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState("dashboard");

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard onNavigate={setPage} />;
      case "generar-cobro": return <GenerarCobro />;
      case "locadores": return <Locadores />;
      case "locatarios": return <Locatarios />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <Topbar title={page} onCreateReceipt={() => setPage("generar-cobro")} />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
