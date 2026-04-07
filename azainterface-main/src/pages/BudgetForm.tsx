import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import {
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  formatCurrency as fmtCurrency,
} from "@/hooks/useBudgets";
import { getCategoryIcon } from "@/lib/icons";
import { ProgressRing } from "@/components/ProgressRing";

const PERIODS = [
  { id: "monthly", label: "Mensal" },
  { id: "weekly", label: "Semanal" },
  { id: "custom", label: "Personalizado" },
] as const;

function todayYmd() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function BudgetForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== "new";

  const { data: categories = [] } = useCategories();
  const { data: existingBudget, isLoading } = useBudget(isEditing ? id || "" : "");
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const expenseCategories = categories.filter((c) => c.type === "DESPESA" && !c.parentId);

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("monthly");
  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (existingBudget) {
      setCategoryId(existingBudget.categoryId || "");
      setAmount(String(Math.round(existingBudget.amount * 100)));
      setPeriod(existingBudget.period);
      setStartDate(existingBudget.startDate || todayYmd());
      setEndDate(existingBudget.endDate || "");
    }
  }, [existingBudget]);

  useEffect(() => {
    if (period !== "custom") {
      setEndDate("");
    }
  }, [period]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const cents = parseInt(numericValue || "0", 10);
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/\D/g, ""));
  };

  const amountValue = parseInt(amount || "0", 10) / 100;
  const hasCustomRange = period !== "custom" || (!!startDate && !!endDate && startDate <= endDate);
  const isValid = categoryId && amountValue > 0 && hasCustomRange;
  const isSaving = createBudget.isPending || updateBudget.isPending;

  const handleSubmit = () => {
    if (!isValid || isSaving) return;

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const payload = {
      name: selectedCategory?.name || "Orcamento",
      categoryId,
      amount: amountValue,
      period,
      startDate: startDate || todayYmd(),
      endDate: period === "custom" ? endDate : undefined,
    };

    if (isEditing && existingBudget) {
      updateBudget.mutate(
        {
          id: existingBudget.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setShowSuccess(true);
            setTimeout(() => navigate("/planning?tab=budgets"), 1200);
          },
        },
      );
      return;
    }

    createBudget.mutate(payload, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => navigate("/planning?tab=budgets"), 1200);
      },
    });
  };

  const handleDelete = () => {
    if (!existingBudget || deleteBudget.isPending) return;
    deleteBudget.mutate(existingBudget.id, {
      onSuccess: () => {
        navigate("/planning?tab=budgets");
      },
    });
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-success flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{isEditing ? "Atualizado!" : "Criado!"}</h2>
        <p className="text-muted-foreground">{isEditing ? "Alteracoes salvas." : "Acompanhe seus gastos."}</p>
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

  const percentage = existingBudget ? Math.min((existingBudget.spent / existingBudget.amount) * 100, 100) : 0;
  const remaining = existingBudget ? Math.max(existingBudget.amount - existingBudget.spent, 0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1">{isEditing ? "Orcamento" : "Novo Orcamento"}</h1>
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={deleteBudget.isPending}
              className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
          )}
        </motion.div>

        {isEditing && existingBudget && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-5 mb-5 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <ProgressRing progress={percentage} size={72} strokeWidth={6} showPercentage />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-900/70 font-medium">{existingBudget.name}</p>
                <p className="text-2xl font-black text-amber-950">{fmtCurrency(existingBudget.spent)}</p>
                <p className="text-xs text-amber-900/60 font-semibold">de {fmtCurrency(existingBudget.amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-lg font-black text-amber-950">{fmtCurrency(remaining)}</p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Restante</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-lg font-black text-amber-950">{percentage.toFixed(0)}%</p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Utilizado</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Categoria</Label>
            <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl focus:ring-primary">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione a categoria</SelectItem>
                {expenseCategories.map((cat) => {
                  const CatIcon = getCategoryIcon(cat.icon || "outros");
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Limite</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatCurrency(amount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="R$ 0,00"
              className="text-2xl font-black text-center h-16 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Periodo</Label>
            <Select value={period} onValueChange={(value) => setPeriod(value as (typeof PERIODS)[number]["id"])}>
              <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Fim</Label>
                <Input
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
                />
              </div>
              {!hasCustomRange && (
                <p className="text-xs text-destructive">Informe um intervalo valido para o periodo personalizado.</p>
              )}
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3 mt-8">
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
