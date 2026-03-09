import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Dashboard from "@/pages/Dashboard";
import GenerarCobro from "@/pages/GenerarCobro";
import Locadores from "@/pages/Locadores";
import Locatarios from "@/pages/Locatarios";
import Login from "@/pages/Login";
import RecibosGenerados from "@/pages/RecibosGenerados";
import { Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

export default function Index() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPage("dashboard");
  };

  // Loading state while checking auth
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard onNavigate={setPage} />;
      case "generar-cobro": return <GenerarCobro />;
      case "locadores": return <Locadores />;
      case "locatarios": return <Locatarios />;
      case "recibos-generados": return <RecibosGenerados />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentPage={page} onNavigate={setPage} onLogout={handleLogout} />
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <Topbar title={page} onCreateReceipt={() => setPage("generar-cobro")} />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
