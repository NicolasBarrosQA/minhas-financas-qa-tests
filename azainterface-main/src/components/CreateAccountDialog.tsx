import { useState } from "react";
import { Building2 } from "lucide-react";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BankLogo } from "@/components/BankLogo";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useCreateAccount, 
  INSTITUTIONS 
} from "@/hooks/useAccounts";
import type { AccountType } from "@/types/entities";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'CORRENTE', label: 'Corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
  { value: 'CARTEIRA', label: 'Carteira' },
];

export function CreateAccountDialog({ open, onOpenChange }: CreateAccountDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CORRENTE');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const createAccount = useCreateAccount();

  const handleSave = () => {
    if (!name || !institution) return;

    createAccount.mutate({
      name,
      type,
      initialBalance: parseFloat(balance) || 0,
      institution,
      color: '#6366f1',
    }, {
      onSuccess: () => {
        setName('');
        setType('CORRENTE');
        setBalance('');
        setInstitution('');
        onOpenChange(false);
      }
    });
  };

  const handleClose = () => {
    setName('');
    setType('CORRENTE');
    setBalance('');
    setInstitution('');
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <div className="w-full max-w-md mx-auto px-4 pb-8 pt-2">
          <DrawerHeader className="px-0 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <DrawerTitle className="text-lg font-bold">Nova Conta</DrawerTitle>
            </div>
          </DrawerHeader>
          
          <div className="space-y-6">
            {/* Nome */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Nome da conta</label>
              <Input
                placeholder="Ex: Conta Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base bg-muted/50 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Tipo</label>
              <Select value={type} onValueChange={(value) => setType(value as AccountType)}>
                <SelectTrigger className="h-12 text-base bg-muted/50 border-0 rounded-xl focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Instituição */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Instituição</label>
              <Select value={institution} onValueChange={setInstitution}>
                <SelectTrigger className="h-12 text-base bg-muted/50 border-0 rounded-xl focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Selecione a instituição" />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTIONS.map((inst) => (
                    <SelectItem key={inst} value={inst}>
                      <div className="flex items-center gap-2">
                        <BankLogo institution={inst} size="sm" />
                        <span>{inst}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Saldo inicial */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Saldo inicial</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="h-12 text-base bg-muted/50 border-0 rounded-xl pl-11 focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>
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
                disabled={!name || !institution || createAccount.isPending}
                className="flex-1 h-12 rounded-xl font-semibold"
              >
                {createAccount.isPending ? 'Criando...' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
