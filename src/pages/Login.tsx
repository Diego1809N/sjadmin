import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: clave });
    setLoading(false);
    if (err) {
      setError("Email o contraseña incorrectos.");
    } else {
      onLogin();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password: clave,
      options: { data: { nombre } },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setRegisterSuccess(true);
    }
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

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5">
          {/* Tabs */}
          <div className="flex rounded-lg bg-secondary p-1 gap-1">
            <button
              onClick={() => { setTab("login"); setError(""); setRegisterSuccess(false); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Ingresar
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); setRegisterSuccess(false); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Registrarse
            </button>
          </div>

          {registerSuccess ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: "hsl(var(--stat-green))" }}>
                <svg className="w-6 h-6" style={{ color: "hsl(var(--stat-green-icon))" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-foreground">¡Registro exitoso!</p>
              <p className="text-xs text-muted-foreground">Revisá tu email para confirmar la cuenta y luego iniciá sesión.</p>
              <button
                onClick={() => { setTab("login"); setRegisterSuccess(false); setEmail(""); setClave(""); }}
                className="text-sm text-primary hover:underline"
              >
                Ir al login
              </button>
            </div>
          ) : (
            <form onSubmit={tab === "login" ? handleLogin : handleRegister} className="space-y-4">
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => { setNombre(e.target.value); setError(""); }}
                    required
                    placeholder="Juan Pérez"
                    className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  required
                  placeholder="usuario@email.com"
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
                  minLength={6}
                  className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
              </div>
              {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {loading ? (tab === "login" ? "Ingresando..." : "Registrando...") : (tab === "login" ? "Ingresar" : "Crear cuenta")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
