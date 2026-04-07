import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, CreditCard, HelpCircle, LogOut, Moon, Settings, Shield, Sun } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/providers/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/providers/ThemeProvider";
import { useDashboard } from "@/hooks/useDashboard";

const menuItems = [
  { icon: CreditCard, label: "Faturas", path: "/invoices" },
  { icon: Bell, label: "Notificações", path: "/notifications" },
  { icon: Shield, label: "Segurança", path: "/security" },
  { icon: HelpCircle, label: "Ajuda e Suporte", path: "/help" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function Profile() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: dashboard } = useDashboard();

  const displayName = profile?.name || user?.email?.split("@")[0] || "Usuario";
  const displayEmail = user?.email || "sem-email@aza.app";
  const initials = displayName.trim().charAt(0).toUpperCase();

  const monthlyIncome = dashboard?.monthlyIncome ?? 0;
  const monthlyExpenses = dashboard?.monthlyExpenses ?? 0;
  const savingsRate = dashboard?.savingsRate ?? 0;
  const monthlyResult = monthlyIncome - monthlyExpenses;

  const diagnosisTitle = monthlyResult >= 0 ? "Mes no azul" : "Mes em alerta";
  const diagnosisText =
    monthlyResult >= 0
      ? "Seu ritmo de gastos esta sustentavel no periodo atual."
      : "Seus gastos passaram das entradas. Vale revisar categorias de maior impacto.";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <MainLayout>
      <div className="px-4 pt-6 pb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aza-card p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-lg font-black text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground mb-1">{displayName}</h1>
              <p className="text-sm text-muted-foreground mb-2">{displayEmail}</p>
              <p className="text-xs text-muted-foreground">Painel de perfil com diagnostico automatico do seu mes.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-5 mb-4"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Diagnostico do mes</p>
          <h2 className="text-lg font-black text-foreground">{diagnosisTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{diagnosisText}</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-card border border-border p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Resultado</p>
              <p className={`text-sm font-bold ${monthlyResult >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatCurrency(monthlyResult)}
              </p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Taxa de poupanca</p>
              <p className="text-sm font-bold text-foreground">{savingsRate.toFixed(0)}%</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Entradas</p>
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(monthlyIncome)}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Saidas</p>
              <p className="text-sm font-bold text-destructive">{formatCurrency(monthlyExpenses)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="aza-card p-4 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-warning" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Modo noturno</p>
              <p className="text-xs text-muted-foreground">{isDark ? "Tema escuro ativado" : "Tema claro ativado"}</p>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-primary" />
          </div>
        </motion.div>

        <div className="aza-card divide-y divide-border mb-6">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 + index * 0.03 }}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate(item.path)}
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <item.icon className="w-5 h-5 text-foreground" />
              </div>
              <span className="flex-1 text-left font-semibold text-foreground">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive font-semibold mb-8"
        >
          <LogOut className="w-5 h-5" />
          Sair da conta
        </motion.button>
      </div>
    </MainLayout>
  );
}
