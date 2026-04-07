import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Tag,
  Bell,
  CreditCard,
  Shield,
  HelpCircle,
  Palette,
  BrainCircuit,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function Settings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const menuItems = [
    { icon: FolderOpen, label: "Categorias", description: "Organize suas transações", path: "/categories" },
    { icon: Tag, label: "Tags", description: "Etiquetas para filtros", path: "/tags" },
    { icon: CreditCard, label: "Faturas", description: "Pague e acompanhe seus cartões", path: "/invoices" },
    {
      icon: BrainCircuit,
      label: "Qualidade da IA",
      description: "Acompanhe métricas da Azinha",
      path: "/settings/azinha-quality",
    },
    { icon: Bell, label: "Notificações", description: "Alertas e lembretes", path: "/notifications" },
    { icon: Shield, label: "Segurança", description: "PIN e biometria", path: "/security" },
    { icon: Palette, label: "Aparência", description: "Tema claro e escuro", path: "/profile" },
  ];

  const aboutItems = [{ icon: HelpCircle, label: "Ajuda e Suporte", path: "/help" }];

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Não foi possível sair",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sessão encerrada",
      description: "Você saiu com sucesso.",
    });
    navigate("/login", { replace: true });
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
              <h1 className="text-xl font-bold">Configurações</h1>
              <p className="text-sm text-muted-foreground">Personalize o AZA</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="aza-card divide-y divide-border mb-6"
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                onClick={() => navigate(item.path)}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </motion.div>

          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">Sobre</h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="aza-card divide-y divide-border"
          >
            {aboutItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                onClick={() => navigate(item.path)}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="flex-1 text-left font-semibold">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground mt-8"
          >
            AZA v1.0.0 (Protótipo)
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-4"
          >
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </Button>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
