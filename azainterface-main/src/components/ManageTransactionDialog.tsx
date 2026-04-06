import { useEffect, useMemo, useState } from "react";
import { Calendar, Save, Trash2 } from "lucide-react";
import type { Transaction } from "@/types/entities";
import { useCategories } from "@/hooks/useCategories";
import {
  useDeleteInstallmentSeries,
  useDeleteTransaction,
  useUpdateInstallmentSeries,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManageTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

function normalizeCurrencyInput(value: string): string {
  return value.replace(/[^0-9,.-]/g, "").replace(",", ".");
}

type EditScope = "single" | "series";

export function ManageTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: ManageTransactionDialogProps) {
  const { data: categories = [] } = useCategories();
  const updateTransaction = useUpdateTransaction();
  const updateInstallmentSeries = useUpdateInstallmentSeries();
  const deleteTransaction = useDeleteTransaction();
  const deleteInstallmentSeries = useDeleteInstallmentSeries();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editScope, setEditScope] = useState<EditScope>("single");

  useEffect(() => {
    if (!open || !transaction) return;
    setAmount(Number(transaction.amount).toFixed(2));
    setDescription(transaction.description || "");
    setDate(transaction.date);
    setCategoryId(transaction.categoryId || "");
    setEditScope("single");
  }, [open, transaction]);

  const isTransfer = transaction?.type === "TRANSFERENCIA";
  const hasInstallmentSeries =
    !!transaction?.installmentSeriesId && (transaction?.totalInstallments || 0) > 1;

  const availableCategories = useMemo(() => {
    if (!transaction) return [];
    if (transaction.type === "RECEITA") return categories.filter((c) => c.type === "RECEITA");
    if (transaction.type === "DESPESA") return categories.filter((c) => c.type === "DESPESA");
    return categories.filter((c) => c.type === "TRANSFERENCIA");
  }, [categories, transaction]);

  const parsedAmount = Number(normalizeCurrencyInput(amount));
  const isValid =
    !!transaction &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    description.trim().length > 0 &&
    !!date &&
    (isTransfer || !!categoryId);

  const isSaving =
    updateTransaction.isPending ||
    updateInstallmentSeries.isPending ||
    deleteTransaction.isPending ||
    deleteInstallmentSeries.isPending;

  const handleSave = () => {
    if (!transaction || !isValid) return;

    const data = {
      amount: parsedAmount,
      description: description.trim(),
      date,
      categoryId: isTransfer ? null : categoryId || null,
    };

    if (hasInstallmentSeries && editScope === "series") {
      updateInstallmentSeries.mutate(
        {
          transactionId: transaction.id,
          data,
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
      return;
    }

    updateTransaction.mutate(
      {
        id: transaction.id,
        data,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  const handleDelete = () => {
    if (!transaction) return;

    if (hasInstallmentSeries && editScope === "series") {
      deleteInstallmentSeries.mutate(transaction.id, {
        onSuccess: () => {
          setConfirmDelete(false);
          onOpenChange(false);
        },
      });
      return;
    }

    deleteTransaction.mutate(transaction.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar transacao</DialogTitle>
          </DialogHeader>

          {!transaction ? null : (
            <div className="space-y-4">
              {hasInstallmentSeries && (
                <>
                  <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                    Voce esta editando uma parcela ({transaction.installmentNumber}/{transaction.totalInstallments}).
                  </div>
                  <div className="space-y-1.5">
                    <Label>Aplicar alteracoes em</Label>
                    <Select value={editScope} onValueChange={(value) => setEditScope(value as EditScope)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Somente esta parcela</SelectItem>
                        <SelectItem value="series">Toda a serie parcelada</SelectItem>
                      </SelectContent>
                    </Select>
                    {editScope === "series" && (
                      <p className="text-xs text-muted-foreground">
                        O valor informado sera aplicado por parcela em toda a serie.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Descricao</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[90px]"
                  placeholder="Descricao da transacao"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data
                </Label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>

              {!isTransfer && (
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateTransaction.isPending || updateInstallmentSeries.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasInstallmentSeries && editScope === "series" ? "Cancelar serie parcelada?" : "Cancelar transacao?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasInstallmentSeries && editScope === "series"
                ? "Essa acao cancela todas as parcelas da serie e recalcula saldos, faturas e limite do cartao."
                : "Essa acao cancela a transacao e recalcula saldos, faturas e limite do cartao."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar transacao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
