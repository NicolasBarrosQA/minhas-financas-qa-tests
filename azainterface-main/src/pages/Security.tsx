import { motion } from "framer-motion";
import { ArrowLeft, Fingerprint, Lock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MainLayout } from "@/layouts/MainLayout";
import { useToast } from "@/hooks/use-toast";
import {
  getLatestDeleteAccountTicket,
  getSupportStatusLabel,
  isOpenSupportStatus,
  useCreateSupportTicket,
  useSupportTickets,
} from "@/hooks/useSupportTickets";
import { useSecuritySettings, type SecuritySettings } from "@/hooks/useUserPreferences";

type SecurityKey = keyof SecuritySettings;

export function Security() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, isLoading, isSaving, setSecuritySetting } = useSecuritySettings();
  const createSupportTicket = useCreateSupportTicket();
  const { data: supportTickets = [] } = useSupportTickets();

  const latestDeleteTicket = getLatestDeleteAccountTicket(supportTickets);
  const hasOpenDeleteRequest = latestDeleteTicket
    ? isOpenSupportStatus(latestDeleteTicket.status)
    : false;

  const securityItems: Array<{
    icon: typeof Fingerprint;
    label: string;
    description: string;
    key: SecurityKey;
    implemented: boolean;
  }> = [
    {
      icon: Fingerprint,
      label: "Biometria",
      description: "Em desenvolvimento: bloqueio biometrico nativo ainda nao esta habilitado neste MVP.",
      key: "biometric",
      implemented: false,
    },
    {
      icon: Lock,
      label: "PIN de acesso",
      description: "Em desenvolvimento: protecao por PIN ainda nao esta habilitada neste MVP.",
      key: "pinEnabled",
      implemented: false,
    },
  ];

  const enabledCount = securityItems.filter((item) => item.implemented && settings[item.key]).length;
  const isAccountProtected = enabledCount >= 1;

  const handleToggle = async (key: SecurityKey, value: boolean) => {
    try {
      await setSecuritySetting(key, value);
      toast({
        title: "Configuracao salva",
        description: "Sua preferencia de seguranca foi atualizada.",
      });
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Nao foi possivel atualizar agora. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const requestDeleteAccount = async () => {
    if (hasOpenDeleteRequest && latestDeleteTicket) {
      toast({
        title: "Solicitacao ja em andamento",
        description: `Acompanhe pelo protocolo ${latestDeleteTicket.id.slice(0, 8).toUpperCase()}.`,
      });
      return;
    }

    try {
      const ticket = await createSupportTicket.mutateAsync({
        channel: "delete_account",
        subject: "Solicitacao de exclusao de conta",
        message: "Solicito a exclusao permanente da minha conta e de todos os dados vinculados.",
        metadata: {
          origin: "security_page",
          requested_at: new Date().toISOString(),
        },
      });

      toast({
        title: "Solicitacao registrada",
        description: `Protocolo ${ticket.id.slice(0, 8).toUpperCase()}. Vamos entrar em contato.`,
      });
    } catch {
      toast({
        title: "Erro ao solicitar exclusao",
        description: "Nao foi possivel abrir o chamado agora.",
        variant: "destructive",
      });
    }
  };

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
              <h1 className="text-xl font-bold">Seguranca</h1>
              <p className="text-sm text-muted-foreground">Proteja sua conta</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl mb-6 ${
              isAccountProtected ? "bg-success/10 border border-success/20" : "bg-muted"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isAccountProtected ? "bg-success/20" : "bg-muted"
                }`}
              >
                <Shield className={`w-6 h-6 ${isAccountProtected ? "text-success" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${isAccountProtected ? "text-success" : "text-foreground"}`}>
                  {isAccountProtected ? "Conta protegida" : "Protecao basica"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {enabledCount} configuracoes de seguranca ativas
                </p>
              </div>
            </div>
          </motion.div>

          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Opcoes de seguranca</h2>
          <div className="space-y-3">
            {securityItems.map((item, index) => {
              const enabled = settings[item.key];

              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <Label className="font-semibold">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={!item.implemented || isLoading || isSaving}
                      onCheckedChange={(checked) => handleToggle(item.key, checked)}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-xl bg-muted mt-6"
          >
            <h3 className="font-medium mb-2">Sobre seguranca no AZA</h3>
            <p className="text-sm text-muted-foreground">
              Seus dados financeiros sao protegidos com criptografia e politicas de acesso por usuario.
            </p>
          </motion.div>

          {latestDeleteTicket && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="p-4 rounded-xl border border-border mt-4"
            >
              <h3 className="font-medium mb-1">Solicitacao de exclusao</h3>
              <p className="text-sm text-muted-foreground">
                Protocolo {latestDeleteTicket.id.slice(0, 8).toUpperCase()} - {getSupportStatusLabel(latestDeleteTicket.status)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Aberto em {new Date(latestDeleteTicket.created_at).toLocaleString("pt-BR")}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <h2 className="text-sm font-medium text-destructive mb-3 px-1">Zona de perigo</h2>
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <p className="font-medium text-destructive mb-1">Excluir conta</p>
              <p className="text-sm text-muted-foreground mb-3">
                Essa acao e irreversivel e apagara todos os seus dados.
              </p>
              <button
                className="text-sm font-medium text-destructive hover:underline disabled:opacity-60 disabled:no-underline"
                onClick={requestDeleteAccount}
                disabled={createSupportTicket.isPending || hasOpenDeleteRequest}
              >
                {createSupportTicket.isPending
                  ? "Enviando solicitacao..."
                  : hasOpenDeleteRequest
                  ? "Solicitacao de exclusao em andamento"
                  : "Solicitar exclusao da conta"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
