import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Calendar, Trash2, Plus, Minus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGoal,
  useGoalMovements,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useAddGoalMovement,
  formatCurrency as fmtCurrency,
  getGoalProgress,
  getDaysToDeadline,
} from "@/hooks/useGoals";
import { ProgressRing } from "@/components/ProgressRing";

export function GoalForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== "new";

  const { data: existingGoal, isLoading } = useGoal(isEditing ? id || "" : "");
  const { data: movements = [] } = useGoalMovements(isEditing ? id || "" : "");
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const addGoalMovement = useAddGoalMovement();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (existingGoal) {
      setName(existingGoal.name);
      setTargetAmount(String(Math.round(existingGoal.targetAmount * 100)));
      setDeadline(existingGoal.deadline || "");
    }
  }, [existingGoal]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const cents = parseInt(numericValue || "0", 10);
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleAmountChange = (value: string) => {
    setTargetAmount(value.replace(/\D/g, ""));
  };

  const targetAmountValue = parseInt(targetAmount || "0", 10) / 100;
  const isValid = name.trim() && targetAmountValue > 0;
  const isSaving = createGoal.isPending || updateGoal.isPending;

  const handleSubmit = () => {
    if (!isValid || isSaving) return;

    const payload = {
      name: name.trim(),
      targetAmount: targetAmountValue,
      deadline: deadline || null,
    };

    if (isEditing && existingGoal) {
      updateGoal.mutate(
        {
          id: existingGoal.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setShowSuccess(true);
            setTimeout(() => navigate("/planning?tab=goals"), 1200);
          },
        },
      );
      return;
    }

    createGoal.mutate(payload, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => navigate("/planning?tab=goals"), 1200);
      },
    });
  };

  const handleDelete = () => {
    if (!existingGoal || deleteGoal.isPending) return;
    deleteGoal.mutate(existingGoal.id, {
      onSuccess: () => {
        navigate("/planning?tab=goals");
      },
    });
  };

  const handleGoalMovement = (type: "APORTE" | "RETIRADA") => {
    if (!existingGoal || addGoalMovement.isPending) return;

    const raw = window.prompt(type === "APORTE" ? "Valor do aporte" : "Valor da retirada", "100");
    if (!raw) return;

    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    addGoalMovement.mutate({
      goalId: existingGoal.id,
      data: { type, amount: parsed },
    });
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-success flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{isEditing ? "Atualizada!" : "Criada!"}</h2>
        <p className="text-muted-foreground">{isEditing ? "Alteracoes salvas." : "Acompanhe seu progresso."}</p>
      </div>
    );
  }

  if (isEditing && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const percentage = existingGoal ? getGoalProgress(existingGoal) : 0;
  const daysLeft = existingGoal ? getDaysToDeadline(existingGoal) : null;
  const remaining = existingGoal ? Math.max(existingGoal.targetAmount - existingGoal.currentAmount, 0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1">{isEditing ? "Meta" : "Nova Meta"}</h1>
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={deleteGoal.isPending}
              className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
          )}
        </motion.div>

        {isEditing && existingGoal && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-5 mb-5 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <ProgressRing progress={percentage} size={72} strokeWidth={6} showPercentage />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-900/70 font-medium">{existingGoal.name}</p>
                <p className="text-2xl font-black text-amber-950">{fmtCurrency(existingGoal.currentAmount)}</p>
                <p className="text-xs text-amber-900/60 font-semibold">de {fmtCurrency(existingGoal.targetAmount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
                <p className="text-base font-black text-amber-950">{fmtCurrency(remaining)}</p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Faltam</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
                <p className="text-base font-black text-amber-950">{percentage.toFixed(0)}%</p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Concluido</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
                <p className="text-base font-black text-amber-950">{daysLeft !== null ? `${daysLeft}d` : "-"}</p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Restantes</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleGoalMovement("APORTE")}
                className="flex-1 bg-white/30 backdrop-blur-sm rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-amber-950"
              >
                <Plus className="w-4 h-4" /> Aporte
              </button>
              <button
                onClick={() => handleGoalMovement("RETIRADA")}
                className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-amber-900/70"
              >
                <Minus className="w-4 h-4" /> Retirada
              </button>
            </div>
          </motion.div>
        )}

        {isEditing && movements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-5"
          >
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Ultimas movimentacoes</p>
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="bg-card rounded-xl p-3 flex items-center justify-between border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.type === "APORTE" ? "bg-success/15" : "bg-destructive/15"}`}>
                      {m.type === "APORTE" ? <Plus className="w-4 h-4 text-success" /> : <Minus className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{m.type === "APORTE" ? "Aporte" : "Retirada"}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(m.date).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm ${m.type === "APORTE" ? "text-success" : "text-destructive"}`}>
                    {m.type === "APORTE" ? "+" : "-"}
                    {fmtCurrency(m.amount)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {isEditing && <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Editar dados</p>}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-5">
          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Nome da meta</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem, Reserva de emergencia"
              className="h-12 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Valor alvo</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatCurrency(targetAmount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="R$ 0,00"
              className="text-2xl font-black text-center h-16 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" /> Data alvo (opcional)
            </Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-12 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex gap-3 mt-8">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button className="flex-1 h-12 rounded-xl font-bold" disabled={!isValid || isSaving} onClick={handleSubmit}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
