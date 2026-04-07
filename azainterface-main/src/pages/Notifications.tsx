import { motion } from "framer-motion";
import { ArrowLeft, Bell, BellOff, Clock, CreditCard, Megaphone, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ComponentType, CSSProperties } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSettings, type NotificationSettings } from "@/hooks/useUserPreferences";

type NotificationKey = keyof NotificationSettings;

export function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, isLoading, isSaving, setNotificationSetting } = useNotificationSettings();

  const handleToggle = async (key: NotificationKey, value: boolean) => {
    try {
      await setNotificationSetting(key, value);
      toast({
        title: "Configuracao salva",
        description: "Suas preferencias foram atualizadas.",
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Nao foi possivel atualizar agora. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const notificationItems: Array<{
    key: NotificationKey;
    icon: ComponentType<{ className?: string; style?: CSSProperties }>;
    label: string;
    description: string;
    color: string;
  }> = [
    {
      key: "dailyReminder",
      icon: Clock,
      label: "Lembrete diario",
      description: "Receba um lembrete para registrar seus gastos",
      color: "#3B82F6",
    },
    {
      key: "invoiceDue",
      icon: CreditCard,
      label: "Vencimento de fatura",
      description: "Alerta quando sua fatura estiver proxima do vencimento",
      color: "#EF4444",
    },
    {
      key: "budgetAlert",
      icon: Target,
      label: "Alerta de orcamento",
      description: "Aviso quando estiver chegando perto do limite",
      color: "#F59E0B",
    },
    {
      key: "goalProgress",
      icon: Target,
      label: "Progresso de metas",
      description: "Atualizacoes sobre o progresso das suas metas",
      color: "#10B981",
    },
    {
      key: "promotions",
      icon: Megaphone,
      label: "Novidades e dicas",
      description: "Receba dicas financeiras e novidades do AZA",
      color: "#8B5CF6",
    },
  ];

  const allEnabled = Object.values(settings).every((v) => v);
  const allDisabled = Object.values(settings).every((v) => !v);
  const activeCount = Object.values(settings).filter(Boolean).length;

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Notificacoes</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus alertas</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl mb-6 ${
              allDisabled ? "bg-muted" : "bg-primary/10 border border-primary/20"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  allDisabled ? "bg-muted" : "bg-primary/20"
                }`}
              >
                {allDisabled ? (
                  <BellOff className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <Bell className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {allDisabled ? "Notificacoes desativadas" : "Notificacoes ativadas"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {allDisabled ? "Voce nao recebera nenhum alerta" : `${activeCount} tipos de alertas ativos`}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-3">
            {notificationItems.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={item.key} className="font-semibold cursor-pointer">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    id={item.key}
                    checked={settings[item.key]}
                    disabled={isLoading || isSaving}
                    onCheckedChange={(checked) => handleToggle(item.key, checked)}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground mt-8 px-4"
          >
            As notificacoes seguem sua atividade no app e podem ser alteradas a qualquer momento.
          </motion.p>
        </div>
      </div>
    </MainLayout>
  );
}
