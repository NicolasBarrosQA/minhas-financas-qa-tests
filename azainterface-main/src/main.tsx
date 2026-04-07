import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hasSupabaseConfig } from "./integrations/supabase/client";

function MissingConfigScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-md p-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Configuração de ambiente ausente</h1>
        <p className="text-sm text-muted-foreground">
          O app não pode iniciar autenticação sem as variáveis do Supabase no deploy.
        </p>
        <div className="text-sm text-foreground space-y-1">
          <p>Configure no provedor de deploy:</p>
          <p><code>VITE_SUPABASE_URL</code></p>
          <p><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  hasSupabaseConfig ? <App /> : <MissingConfigScreen />,
);
