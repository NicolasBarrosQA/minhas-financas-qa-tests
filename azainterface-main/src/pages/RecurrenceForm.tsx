import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, TrendingDown, TrendingUp, Trash2, Pause, Play } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import {
  useRecurrence,
  useCreateRecurrence,
  useUpdateRecurrence,
  useDeleteRecurrence,
  useToggleRecurrence,
  formatCurrency as fmtCurrency,
  getFrequencyLabel,
} from "@/hooks/useRecurrences";
import type { RecurrenceFrequency } from "@/types/entities";
import { getCategoryIcon } from "@/lib/icons";

const frequencies: Array<{ id: RecurrenceFrequency; label: string }> = [
  { id: "DIARIA", label: "Diaria" },
  { id: "SEMANAL", label: "Semanal" },
  { id: "QUINZENAL", label: "Quinzenal" },
  { id: "MENSAL", label: "Mensal" },
  { id: "BIMESTRAL", label: "Bimestral" },
  { id: "TRIMESTRAL", label: "Trimestral" },
  { id: "SEMESTRAL", label: "Semestral" },
  { id: "ANUAL", label: "Anual" },
];

const weekDays = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terca" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sabado" },
];

const monthBasedFrequencies: RecurrenceFrequency[] = ["MENSAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"];

export function RecurrenceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== "new";

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: existingRecurrence, isLoading } = useRecurrence(isEditing ? id || "" : "");
  const createRecurrence = useCreateRecurrence();
  const updateRecurrence = useUpdateRecurrence();
  const deleteRecurrence = useDeleteRecurrence();
  const toggleRecurrence = useToggleRecurrence();

  const [type, setType] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MENSAL");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (existingRecurrence) {
      setType(existingRecurrence.type);
      setName(existingRecurrence.name);
      setAccountId(existingRecurrence.accountId || "");
      setAmount(String(Math.round(existingRecurrence.amount * 100)));
      setFrequency(existingRecurrence.frequency);
      setCategoryId(existingRecurrence.categoryId || "");
      setDayOfMonth(existingRecurrence.dayOfMonth ? String(existingRecurrence.dayOfMonth) : "");
      setDayOfWeek(existingRecurrence.dayOfWeek !== undefined ? String(existingRecurrence.dayOfWeek) : "");
    }
  }, [existingRecurrence]);

  useEffect(() => {
    if (frequency === "SEMANAL") {
      if (!dayOfWeek) {
        setDayOfWeek(String(new Date().getDay()));
      }
      setDayOfMonth("");
      return;
    }

    if (monthBasedFrequencies.includes(frequency)) {
      if (!dayOfMonth) {
        setDayOfMonth(String(new Date().getDate()));
      }
      setDayOfWeek("");
      return;
    }

    setDayOfMonth("");
    setDayOfWeek("");
  }, [dayOfMonth, dayOfWeek, frequency]);

  const availableCategories = useMemo(() => {
    const categoryType = type === "RECEITA" ? "RECEITA" : "DESPESA";
    return categories.filter((cat) => cat.type === categoryType && !cat.parentId);
  }, [categories, type]);

  useEffect(() => {
    if (!categoryId) return;
    const stillExists = availableCategories.some((cat) => cat.id === categoryId);
    if (!stillExists) setCategoryId("");
  }, [availableCategories, categoryId]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const cents = parseInt(numericValue || "0", 10);
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/\D/g, ""));
  };

  const amountValue = parseInt(amount || "0", 10) / 100;
  const parsedDayOfMonth = Number(dayOfMonth);
  const hasValidDayOfMonth = Number.isFinite(parsedDayOfMonth) && parsedDayOfMonth >= 1 && parsedDayOfMonth <= 31;
  const hasValidDayOfWeek = dayOfWeek !== "";
  const isScheduleValid =
    frequency === "SEMANAL"
      ? hasValidDayOfWeek
      : monthBasedFrequencies.includes(frequency)
      ? hasValidDayOfMonth
      : true;

  const isValid = name.trim() && amountValue > 0 && !!accountId && isScheduleValid;
  const isSaving = createRecurrence.isPending || updateRecurrence.isPending;

  const handleSubmit = () => {
    if (!isValid || isSaving) return;

    const payload = {
      name: name.trim(),
      type,
      amount: amountValue,
      frequency,
      accountId,
      categoryId: categoryId || undefined,
      dayOfMonth: monthBasedFrequencies.includes(frequency) ? parsedDayOfMonth : undefined,
      dayOfWeek: frequency === "SEMANAL" ? Number(dayOfWeek) : undefined,
    };

    if (isEditing && existingRecurrence) {
      updateRecurrence.mutate(
        {
          id: existingRecurrence.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setShowSuccess(true);
            setTimeout(() => navigate("/planning?tab=recurring"), 1200);
          },
        },
      );
      return;
    }

    createRecurrence.mutate(
      {
        ...payload,
        startDate: new Date().toISOString().slice(0, 10),
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(() => navigate("/planning?tab=recurring"), 1200);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!existingRecurrence || deleteRecurrence.isPending) return;
    deleteRecurrence.mutate(existingRecurrence.id, {
      onSuccess: () => {
        navigate("/planning?tab=recurring");
      },
    });
  };

  const handleToggle = () => {
    if (!existingRecurrence || toggleRecurrence.isPending) return;
    toggleRecurrence.mutate(existingRecurrence.id);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-success flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{isEditing ? "Atualizada!" : "Criada!"}</h2>
        <p className="text-muted-foreground">{isEditing ? "Alteracoes salvas." : "Transacao automatica configurada."}</p>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm border border-border">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1">{isEditing ? "Recorrencia" : "Nova Recorrencia"}</h1>
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={deleteRecurrence.isPending}
              className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
          )}
        </motion.div>

        {isEditing && existingRecurrence && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-5 mb-5 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/30 flex items-center justify-center">
                {(() => {
                  const Icon = getCategoryIcon(existingRecurrence.categoryIcon || "outros");
                  return <Icon className="w-7 h-7 text-amber-900" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-900/70 font-medium">{existingRecurrence.name}</p>
                <p className="text-2xl font-black text-amber-950">
                  {existingRecurrence.type === "RECEITA" ? "+" : "-"}
                  {fmtCurrency(existingRecurrence.amount)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
                <p className="text-sm font-black text-amber-950">{getFrequencyLabel(existingRecurrence.frequency)}</p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Frequencia</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
                <p className="text-sm font-black text-amber-950">{existingRecurrence.isActive ? "Ativo" : "Pausado"}</p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Status</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
                <p className="text-sm font-black text-amber-950">
                  {new Date(existingRecurrence.nextRun).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </p>
                <p className="text-[10px] text-amber-900/70 font-semibold">Proximo</p>
              </div>
            </div>

            <button
              onClick={handleToggle}
              className="w-full mt-4 bg-white/30 backdrop-blur-sm rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-amber-950"
            >
              {existingRecurrence.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {existingRecurrence.isActive ? "Pausar recorrencia" : "Ativar recorrencia"}
            </button>
          </motion.div>
        )}

        {isEditing && <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Editar dados</p>}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Tipo</Label>
            <div className="bg-muted/50 rounded-xl p-1 flex gap-1">
              <button
                onClick={() => setType("DESPESA")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  type === "DESPESA" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <TrendingDown className="w-4 h-4" /> Despesa
              </button>
              <button
                onClick={() => setType("RECEITA")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  type === "RECEITA" ? "bg-success text-success-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Receita
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Nome</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Salario, Aluguel, Netflix"
              className="h-12 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Categoria</Label>
            <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl focus:ring-primary">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {availableCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon || "outros");
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Conta</Label>
            <Select value={accountId || "none"} onValueChange={(value) => setAccountId(value === "none" ? "" : value)}>
              <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl focus:ring-primary">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione a conta</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Valor</Label>
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
            <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Frequencia</Label>
            <Select value={frequency} onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}>
              <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl focus:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequency === "SEMANAL" && (
            <div>
              <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Dia da semana</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl focus:ring-primary">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {monthBasedFrequencies.includes(frequency) && (
            <div>
              <Label className="text-xs font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Dia do mes</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Ex: 5"
                className="h-12 bg-muted/50 border-0 rounded-xl focus-visible:ring-primary"
              />
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3 mt-8 mb-8">
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
