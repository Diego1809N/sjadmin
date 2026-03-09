import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LoginProps {
  onLogin: () => void;
}

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin";

export default function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (usuario !== "admin" || clave !== "admin") {
      setError("Usuario o contraseña incorrectos.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    setLoading(false);

    if (err) {
      // If admin account doesn't exist yet, create it silently
      const { error: signUpErr } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      if (!signUpErr) {
        // Try login again after signup
        setLoading(true);
        const { error: retryErr } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });
        setLoading(false);
        if (retryErr) setError("Error al iniciar sesión. Intentá de nuevo.");
      } else {
        setError("Error al iniciar sesión. Intentá de nuevo.");
      }
    }
    // onLogin() not needed — Index.tsx listens to onAuthStateChange
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">NEGOCIOS INMOBILIARIOS</h1>
          <p className="text-sm text-muted-foreground mt-1">Portal de Gestión Inmobiliaria</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-5 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => { setUsuario(e.target.value); setError(""); }}
              required
              placeholder="admin"
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={clave}
              onChange={(e) => { setClave(e.target.value); setError(""); }}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
