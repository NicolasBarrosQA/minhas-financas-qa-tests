import { useState } from "react";
import { CreditCard } from "lucide-react";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCard, CARD_BRANDS } from "@/hooks/useCards";
import type { CardType } from "@/types/entities";

interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCardDialog({ open, onOpenChange }: CreateCardDialogProps) {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [brand, setBrand] = useState('Mastercard');
  const [closingDay, setClosingDay] = useState('5');
  const [dueDay, setDueDay] = useState('10');
  const [lastFour, setLastFour] = useState('');
  const createCard = useCreateCard();

  const handleSave = () => {
    if (!name || !limit) return;
    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) return;

    const normalizeDay = (raw: string, fallback: number) => {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(31, Math.max(1, parsed));
    };

    const normalizedLastFour = lastFour.replace(/\D/g, "").slice(0, 4);

    createCard.mutate({
      name,
      type: 'CREDITO' as CardType,
      limit: parsedLimit,
      closingDay: normalizeDay(closingDay, 5),
      dueDay: normalizeDay(dueDay, 10),
      brand,
      lastFourDigits: normalizedLastFour,
      color: '#6366f1',
    }, {
      onSuccess: () => {
        setName('');
        setLimit('');
        setBrand('Mastercard');
        setClosingDay('5');
        setDueDay('10');
        setLastFour('');
        onOpenChange(false);
      }
    });
  };

  const handleClose = () => {
    setName('');
    setLimit('');
    setBrand('Mastercard');
    setClosingDay('5');
    setDueDay('10');
    setLastFour('');
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <div className="w-full max-w-md mx-auto px-4 pb-8 pt-2">
          <DrawerHeader className="px-0 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <DrawerTitle className="text-lg font-bold">Novo Cartão</DrawerTitle>
            </div>
          </DrawerHeader>
          
          <div className="space-y-6">
            {/* Nome */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Nome do cartão</label>
              <Input
                placeholder="Ex: Nubank Platinum"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base bg-muted/50 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            {/* Limite */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Limite</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  type="number"
                  placeholder="5.000"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="h-12 text-base bg-muted/50 border-0 rounded-xl pl-11 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Bandeira */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Bandeira</label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="h-12 text-base bg-muted/50 border-0 rounded-xl focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Selecione a bandeira" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Fechamento</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="5"
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value.replace(/\D/g, ""))}
                  className="h-12 text-base text-center bg-muted/50 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Vencimento</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="10"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value.replace(/\D/g, ""))}
                  className="h-12 text-base text-center bg-muted/50 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Últimos dígitos */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Últimos 4 dígitos <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                maxLength={4}
                placeholder="1234"
                value={lastFour}
                onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="h-12 text-base bg-muted/50 border-0 rounded-xl tracking-widest focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="ghost" 
                onClick={handleClose}
                className="flex-1 h-12 rounded-xl text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!name || !limit || createCard.isPending}
                className="flex-1 h-12 rounded-xl font-semibold"
              >
                {createCard.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
