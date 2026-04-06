import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCcw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import {
  formatAzinhaMetricDate,
  getAzinhaMetricsSnapshot,
  resetAzinhaMetrics,
  type AzinhaMetricEvent,
  type AzinhaMetricsSnapshot,
} from "@/services/azinhaMetrics";

const EVENT_LABEL: Record<AzinhaMetricEvent, string> = {
  message_received: "Mensagem recebida",
  transaction_signal: "Sinal de transação",
  draft_created: "Rascunho criado",
  clarification_requested: "Esclarecimento solicitado",
  low_confidence: "Baixa confiança",
  draft_corrected: "Rascunho corrigido",
  draft_confirmed: "Rascunho confirmado",
  draft_canceled: "Rascunho cancelado",
  save_failed: "Falha ao salvar",
  fallback_response: "Fallback de IA",
  finance_qa_reply: "Resposta de pergunta financeira",
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function AzinhaQuality() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<AzinhaMetricsSnapshot>(() => getAzinhaMetricsSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(getAzinhaMetricsSnapshot());
    refresh();

    const timer = window.setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const totalsCards = useMemo(
    () => [
      { label: "Mensagens", value: snapshot.totals.messages },
      { label: "Sinais de transação", value: snapshot.totals.transactionSignals },
      { label: "Rascunhos criados", value: snapshot.totals.draftsCreated },
      { label: "Correções do usuário", value: snapshot.totals.corrections },
      { label: "Confirmações", value: snapshot.totals.confirmed },
      { label: "Esclarecimentos", value: snapshot.totals.clarifications },
      { label: "Baixa confiança", value: snapshot.totals.lowConfidence },
      { label: "Fallback de IA", value: snapshot.totals.fallbackResponses },
      { label: "Falhas ao salvar", value: snapshot.totals.saveErrors },
    ],
    [snapshot],
  );

  const rateCards = useMemo(
    () => [
      { label: "Taxa de rascunho útil", value: formatPercent(snapshot.rates.draftSuccessRate) },
      { label: "Taxa de confirmação", value: formatPercent(snapshot.rates.confirmationRate) },
      { label: "Taxa de correção", value: formatPercent(snapshot.rates.correctionRate) },
      { label: "Taxa de fallback", value: formatPercent(snapshot.rates.fallbackRate) },
      { label: "Taxa de baixa confiança", value: formatPercent(snapshot.rates.lowConfidenceRate) },
    ],
    [snapshot],
  );

  const handleReset = () => {
    resetAzinhaMetrics();
    setSnapshot(getAzinhaMetricsSnapshot());
  };

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background px-4 py-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Qualidade da IA</h1>
            <p className="text-sm text-muted-foreground">Métricas operacionais da Azinha</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="aza-card p-4 mb-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="font-semibold">Resumo de desempenho</p>
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={handleReset}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Zerar métricas
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {rateCards.map((item) => (
              <div key={item.label} className="rounded-xl bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-base font-semibold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="aza-card p-4 mb-4"
        >
          <p className="font-semibold mb-3">Contadores</p>
          <div className="grid grid-cols-2 gap-2">
            {totalsCards.map((item) => (
              <div key={item.label} className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-base font-semibold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="aza-card p-4"
        >
          <p className="font-semibold mb-3">Eventos recentes</p>
          {snapshot.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há eventos registrados.</p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {snapshot.recent.slice(0, 30).map((item) => (
                <div key={`${item.at}-${item.event}-${item.detail || ""}`} className="rounded-xl bg-muted/50 px-3 py-2">
                  <p className="text-sm font-medium">{EVENT_LABEL[item.event] || item.event}</p>
                  {item.detail ? <p className="text-xs text-muted-foreground">Detalhe: {item.detail}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatAzinhaMetricDate(item.at)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
