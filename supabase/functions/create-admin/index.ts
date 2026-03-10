import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "admin@admin.com",
    password: "Admin1!2026",
    email_confirm: true,
  });

  if (error && error.message !== "A user with this email address has already been registered") {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ ok: true, user: data?.user?.id ?? "exists" }), { status: 200 });
});
