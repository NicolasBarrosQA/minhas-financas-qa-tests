import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingDown, 
  TrendingUp, 
  ArrowLeftRight, 
  CreditCard,
  Calendar,
  Building2,
  FileText,
  Tag,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Mascot } from "@/components/Mascot";
import { useToast } from "@/hooks/use-toast";
import { useAccounts } from "@/hooks/useAccounts";
import { useCards } from "@/hooks/useCards";
import { useCategories } from "@/hooks/useCategories";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

export type TransactionType = 'expense' | 'income' | 'transfer' | 'credit_card';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  accountId?: string;
  cardId?: string;
}

const typeConfig: Record<TransactionType, { 
  label: string; 
  icon: typeof TrendingDown; 
  color: string;
  bgColor: string;
  successMessage: string;
}> = {
  expense: { 
    label: 'Despesa', 
    icon: TrendingDown, 
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    successMessage: 'Despesa registrada!',
  },
  income: { 
    label: 'Entrada', 
    icon: TrendingUp, 
    color: 'text-success',
    bgColor: 'bg-success',
    successMessage: 'Receita registrada!',
  },
  transfer: { 
    label: 'Transferência', 
    icon: ArrowLeftRight, 
    color: 'text-aza-sky',
    bgColor: 'bg-aza-sky',
    successMessage: 'Transferência concluída!',
  },
  credit_card: { 
    label: 'Cartão', 
    icon: CreditCard, 
    color: 'text-aza-pink',
    bgColor: 'bg-aza-pink',
    successMessage: 'Compra registrada!',
  },
};

export function TransactionModal({ isOpen, onClose, initialType = 'expense', accountId, cardId }: TransactionModalProps) {
  const { toast } = useToast();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: categories = [] } = useCategories();
  const createTransaction = useCreateTransaction();
  
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState(cardId || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [date, setDate] = useState<Date>(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(cat => {
    if (type === 'income') return cat.type === 'RECEITA';
    if (type === 'expense' || type === 'credit_card') return cat.type === 'DESPESA';
    return cat.type === 'TRANSFERENCIA';
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setAmount('');
      setDescription('');
      setSelectedAccountId(accountId || '');
      setDestinationAccountId('');
      setSelectedCardId(cardId || '');
      setSelectedCategoryId('');
      setInstallments('1');
      setDate(new Date());
      setShowSuccess(false);
    }
  }, [isOpen, initialType, accountId, cardId]);

  const config = typeConfig[type];

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const cents = parseInt(numericValue || '0', 10);
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setAmount(numericValue);
  };

  const getAmountValue = () => parseInt(amount || '0', 10) / 100;

  const isFormValid = () => {
    const amountValue = getAmountValue();
    if (amountValue <= 0) return false;
    if (!description.trim()) return false;

    switch (type) {
      case 'income':
      case 'expense':
        return !!selectedAccountId && !!selectedCategoryId;
      case 'transfer':
        return !!selectedAccountId && !!destinationAccountId && selectedAccountId !== destinationAccountId;
      case 'credit_card':
        return !!selectedCardId && !!selectedCategoryId && Number(installments) >= 1;
    }
  };

  const handleSubmit = () => {
    if (!isFormValid() || createTransaction.isPending) return;

    const amountValue = getAmountValue();
    const payloadDate = format(date, 'yyyy-MM-dd');

    const payload =
      type === 'income'
        ? {
            type: 'RECEITA' as const,
            amount: amountValue,
            description,
            date: payloadDate,
            accountId: selectedAccountId,
            categoryId: selectedCategoryId,
          }
        : type === 'expense'
        ? {
            type: 'DESPESA' as const,
            amount: amountValue,
            description,
            date: payloadDate,
            accountId: selectedAccountId,
            categoryId: selectedCategoryId,
          }
        : type === 'transfer'
        ? {
            type: 'TRANSFERENCIA' as const,
            amount: amountValue,
            description,
            date: payloadDate,
            accountId: selectedAccountId,
            transferToAccountId: destinationAccountId,
          }
        : {
            type: 'DESPESA' as const,
            amount: amountValue,
            description,
            date: payloadDate,
            cardId: selectedCardId,
            categoryId: selectedCategoryId,
            installments: Number(installments) || 1,
          };

    createTransaction.mutate(payload, {
      onSuccess: () => {
        setShowSuccess(true);
        toast({
          title: config.successMessage,
          description: "Lançamento salvo com sucesso.",
        });

        setTimeout(() => {
          onClose();
        }, 2000);
      },
      onError: () => {
        toast({
          title: 'Erro ao registrar lancamento',
          description: 'Tente novamente em alguns instantes.',
          variant: 'destructive',
        });
      },
    });
  };

  const handleTypeChange = (value: string) => {
    if (value === 'income' || value === 'expense') {
      setType(value as TransactionType);
      setSelectedCategoryId('');
      setInstallments('1'); // Reset category when type changes
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Success State
  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md border-0 bg-background p-0 overflow-hidden">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="mb-4"
            >
              <Mascot mood="celebrating" size="lg" showBubble={false} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-foreground mb-2"
            >
              {config.successMessage}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground mt-4"
            >
              Registro concluído. Você já pode lançar outro item.
            </motion.p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render Income/Expense Form
  if (type === 'income' || type === 'expense') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md border-0 bg-background p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-bold text-foreground">
              Novo Lançamento
            </DialogTitle>
          </DialogHeader>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* 1. VALOR */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Valor *
              </Label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(amount)}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full h-14 text-2xl font-bold text-foreground bg-muted/50 border-0 rounded-xl px-4 outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* 2. TIPO DE LANÇAMENTO */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Tipo de Lançamento *
              </Label>
              <ToggleGroup 
                type="single" 
                value={type} 
                onValueChange={handleTypeChange}
                className="w-full grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-xl"
              >
                <ToggleGroupItem 
                  value="income" 
                  className={cn(
                    "flex-1 h-11 rounded-lg font-semibold transition-all data-[state=on]:shadow-sm",
                    type === 'income' 
                      ? "bg-success text-white data-[state=on]:bg-success" 
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Entrada
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="expense" 
                  className={cn(
                    "flex-1 h-11 rounded-lg font-semibold transition-all data-[state=on]:shadow-sm",
                    type === 'expense' 
                      ? "bg-destructive text-white data-[state=on]:bg-destructive" 
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Despesa
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* 3. CATEGORIA */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoria *
              </Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50">
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. CONTA */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Conta *
              </Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. DATA */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data *
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-12 justify-between bg-muted/50 border-0 rounded-xl font-normal hover:bg-muted",
                      !date && "text-muted-foreground"
                    )}
                  >
                    {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-lg z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(newDate);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 6. DESCRIÇÃO */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Descrição *
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'income' 
                    ? "Ex: Salário janeiro, Freelance, Dividendos..." 
                    : "Ex: Compras no supermercado, Uber para trabalho..."
                }
                className="min-h-[80px] bg-muted/50 border-0 rounded-xl resize-none"
              />
            </div>

            {/* AÇÕES */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || createTransaction.isPending}
                className="w-full h-12 text-base font-bold rounded-xl"
                size="lg"
              >
                CRIAR LANÇAMENTO
              </Button>
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="w-full h-12 text-base font-medium text-muted-foreground hover:text-foreground rounded-xl"
                size="lg"
              >
                CANCELAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render Transfer Form
  if (type === 'transfer') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md border-0 bg-background p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-aza-sky" />
              Nova Transferência
            </DialogTitle>
          </DialogHeader>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* 1. VALOR */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Valor *
              </Label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(amount)}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full h-14 text-2xl font-bold text-foreground bg-muted/50 border-0 rounded-xl px-4 outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* 2. CONTA DE ORIGEM */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Conta de Origem *
              </Label>
              <Select value={selectedAccountId} onValueChange={(value) => {
                setSelectedAccountId(value);
                if (destinationAccountId === value) setDestinationAccountId('');
              }}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl">
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. CONTA DE DESTINO */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Conta de Destino *
              </Label>
              <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl">
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50">
                  {accounts
                    .filter((acc) => acc.id !== selectedAccountId)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

  
          {/* 4. DATA */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data *
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-12 justify-between bg-muted/50 border-0 rounded-xl font-normal hover:bg-muted",
                      !date && "text-muted-foreground"
                    )}
                  >
                    {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-lg z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(newDate);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 5. DESCRIÇÃO */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Descrição *
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Reserva de emergência, Investimentos, Pagamento..."
                className="min-h-[80px] bg-muted/50 border-0 rounded-xl resize-none"
              />
            </div>

            {/* AÇÕES */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || createTransaction.isPending}
                className="w-full h-12 text-base font-bold rounded-xl"
                size="lg"
              >
                CRIAR LANÇAMENTO
              </Button>
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="w-full h-12 text-base font-medium text-muted-foreground hover:text-foreground rounded-xl"
                size="lg"
              >
                CANCELAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render Credit Card Form
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-background p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-aza-pink" />
            Nova Compra no Cartão
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* 1. VALOR */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Valor *
            </Label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formatCurrency(amount)}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="R$ 0,00"
                className="w-full h-14 text-2xl font-bold text-foreground bg-muted/50 border-0 rounded-xl px-4 outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* 2. CARTÃO */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Cartão *
            </Label>
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl">
                <SelectValue placeholder="Selecione um cartão" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    <div className="flex items-center gap-2">
                      {card.name}
                      <span className="text-muted-foreground text-xs">
                        •••• {card.lastFourDigits || '0000'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. CATEGORIA */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categoria *
            </Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {/* 4. PARCELAMENTO */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Parcelamento
            </Label>
            <Select value={installments} onValueChange={setInstallments}>
              <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl">
                <SelectValue placeholder="Selecione as parcelas" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                {Array.from({ length: 12 }, (_, index) => {
                  const value = String(index + 1);
                  return (
                    <SelectItem key={value} value={value}>
                      {value}x
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 5. DATA */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data *
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-12 justify-between bg-muted/50 border-0 rounded-xl font-normal hover:bg-muted",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border border-border shadow-lg z-50" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    if (newDate) {
                      setDate(newDate);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 5. DESCRIÇÃO */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Descrição *
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Restaurante, Netflix, Compras online..."
              className="min-h-[80px] bg-muted/50 border-0 rounded-xl resize-none"
            />
          </div>

          {/* AÇÕES */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || createTransaction.isPending}
              className="w-full h-12 text-base font-bold rounded-xl"
              size="lg"
            >
              CRIAR LANÇAMENTO
            </Button>
            <Button
              onClick={handleCancel}
              variant="ghost"
              className="w-full h-12 text-base font-medium text-muted-foreground hover:text-foreground rounded-xl"
              size="lg"
            >
              CANCELAR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}











