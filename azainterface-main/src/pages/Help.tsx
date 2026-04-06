import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ExternalLink, HelpCircle, Mail, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getSupportStatusLabel,
  useCreateSupportTicket,
  useSupportTickets,
  type SupportTicketChannel,
} from "@/hooks/useSupportTickets";

export function Help() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createSupportTicket = useCreateSupportTicket();
  const { data: supportTickets = [] } = useSupportTickets();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const faqs = [
    {
      id: "1",
      question: "Posso conectar minha conta bancaria?",
      answer:
        "No momento, o AZA funciona com lancamentos manuais. A integracao com bancos via Open Finance esta em desenvolvimento.",
    },
    {
      id: "2",
      question: "Como criar um orcamento?",
      answer:
        "Va em Planejar > Orcamentos > Criar primeiro orcamento. Defina categoria, valor limite e periodo.",
    },
    {
      id: "3",
      question: "Como cadastrar uma meta financeira?",
      answer:
        "Va em Planejar > Metas > Criar primeira meta. Informe valor alvo, prazo e nome da meta.",
    },
    {
      id: "4",
      question: "Como registrar uma transacao?",
      answer:
        "Use o botao de adicionar no menu inferior. Escolha entrada, despesa, transferencia ou compra no cartao.",
    },
    {
      id: "5",
      question: "Meus dados estao seguros?",
      answer:
        "Sim. Seus dados sao criptografados e protegidos. Nunca compartilhamos suas informacoes financeiras sem sua autorizacao.",
    },
  ];

  const openTicket = async (channel: SupportTicketChannel, ticketSubject: string, ticketMessage: string) => {
    try {
      const ticket = await createSupportTicket.mutateAsync({
        channel,
        subject: ticketSubject,
        message: ticketMessage,
        metadata: {
          origin: "help_page",
          opened_at: new Date().toISOString(),
        },
      });

      toast({
        title: "Chamado aberto",
        description: `Protocolo ${ticket.id.slice(0, 8).toUpperCase()}.`,
      });
      return true;
    } catch {
      toast({
        title: "Erro ao abrir chamado",
        description: "Nao foi possivel registrar seu pedido agora.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleQuickContact = async (method: "chat" | "email") => {
    const subjectByMethod = method === "chat" ? "Solicitacao via chat ao vivo" : "Solicitacao via email";
    const messageByMethod =
      method === "chat"
        ? "Quero atendimento via chat ao vivo."
        : "Quero atendimento via email no endereco cadastrado.";

    await openTicket(method, subjectByMethod, messageByMethod);
  };

  const submitFormTicket = async () => {
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) {
      toast({
        title: "Preencha os campos",
        description: "Informe assunto e mensagem para enviar o chamado.",
      });
      return;
    }

    const ok = await openTicket("form", cleanSubject, cleanMessage);
    if (!ok) return;

    setSubject("");
    setMessage("");
    setIsFormOpen(false);
  };

  const recentTickets = supportTickets.slice(0, 5);

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
              <h1 className="text-xl font-bold">Ajuda e Suporte</h1>
              <p className="text-sm text-muted-foreground">Estamos aqui para ajudar</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-primary/10 border border-primary/20 mb-6"
          >
            <div className="flex items-center gap-4">
              <Mascot mood="happy" size="md" showBubble={false} />
              <div>
                <p className="font-semibold">Oi! Sou a Azinha</p>
                <p className="text-sm text-muted-foreground">Posso te ajudar com duvidas sobre o app.</p>
              </div>
            </div>
          </motion.div>

          <h2 className="font-bold mb-3">Perguntas Frequentes</h2>
          <div className="space-y-2 mb-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Collapsible
                  open={openFaq === faq.id}
                  onOpenChange={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                >
                  <CollapsibleTrigger className="w-full p-4 rounded-xl bg-card border border-border text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium pr-4">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform ${
                          openFaq === faq.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4 pt-2">
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            ))}
          </div>

          <h2 className="font-bold mb-3">Fale Conosco</h2>
          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full p-4 rounded-xl bg-card border border-border flex items-center gap-4"
              onClick={() => handleQuickContact("chat")}
              disabled={createSupportTicket.isPending}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Chat ao vivo</p>
                <p className="text-xs text-muted-foreground">Abrir atendimento</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full p-4 rounded-xl bg-card border border-border flex items-center gap-4"
              onClick={() => handleQuickContact("email")}
              disabled={createSupportTicket.isPending}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Email</p>
                <p className="text-xs text-muted-foreground">Abrir chamado por email</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </div>

          <h2 className="font-bold mt-8 mb-3">Chamados recentes</h2>
          {recentTickets.length === 0 ? (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              Nenhum chamado aberto ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {getSupportStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    #{ticket.id.slice(0, 8).toUpperCase()} - {new Date(ticket.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">Nao encontrou o que procurava?</p>
            <Button variant="outline" onClick={() => setIsFormOpen(true)}>
              Enviar uma mensagem
            </Button>
          </motion.div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo chamado</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Assunto"
              maxLength={120}
            />
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descreva sua duvida ou problema"
              className="min-h-[120px]"
              maxLength={2000}
            />
            <div className="flex items-center gap-2">
              <Button className="flex-1" onClick={submitFormTicket} disabled={createSupportTicket.isPending}>
                {createSupportTicket.isPending ? "Enviando..." : "Enviar"}
              </Button>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
