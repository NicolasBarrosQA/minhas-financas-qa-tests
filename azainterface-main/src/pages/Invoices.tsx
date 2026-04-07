import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useInvoices, usePayInvoice, formatCurrency, getInvoiceStatus, getInvoiceProgress, getDaysUntilDue, formatInvoiceMonth } from "@/hooks/useInvoices";
import { useCards } from "@/hooks/useCards";
import { useAccounts } from "@/hooks/useAccounts";
import type { Invoice } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseLocalDate } from "@/lib/date";

export function Invoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get('cardId') || undefined;
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    accountId: '',
  });

  const { data: invoices = [], isLoading } = useInvoices(cardId);
  const { data: cards = [] } = useCards();
  const { data: accounts = [] } = useAccounts();
  const payInvoice = usePayInvoice();
  const hasAccounts = accounts.length > 0;

  const handleOpenPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const remaining = invoice.closingBalance - invoice.paidAmount;
    setPaymentData({
      amount: remaining.toFixed(2),
      accountId: accounts[0]?.id || '',
    });
    setIsPaymentSheetOpen(true);
  };

  const handlePay = () => {
    if (!selectedInvoice || !paymentData.amount || !paymentData.accountId || !hasAccounts) return;

    payInvoice.mutate({
      id: selectedInvoice.id,
      data: {
        amount: parseFloat(paymentData.amount),
        accountId: paymentData.accountId,
      },
    }, {
      onSuccess: () => {
        setIsPaymentSheetOpen(false);
        setSelectedInvoice(null);
      },
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAGA': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'ATRASADA': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default: return <Clock className="w-5 h-5 text-warning" />;
    }
  };

  // Agrupar por cartão se não tiver filtro
  const groupedInvoices = invoices.reduce((acc, inv) => {
    const cardName = inv.card?.name || 'Sem cartão';
    if (!acc[cardName]) acc[cardName] = [];
    acc[cardName].push(inv);
    return acc;
  }, {} as Record<string, Invoice[]>);

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Faturas</h1>
              <p className="text-sm text-muted-foreground">
                {cardId ? cards.find(c => c.id === cardId)?.name : 'Todos os cartões'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && Object.entries(groupedInvoices).map(([cardName, cardInvoices], groupIndex) => (
            <motion.div
              key={cardName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
              className="mb-6"
            >
              {!cardId && (
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-muted-foreground">{cardName}</h3>
                </div>
              )}

              <div className="space-y-3">
                {cardInvoices.map((invoice, index) => {
                  const status = getInvoiceStatus(invoice);
                  const progress = getInvoiceProgress(invoice);
                  const daysUntil = getDaysUntilDue(invoice);
                  const remaining = invoice.closingBalance - invoice.paidAmount;

                  return (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIndex * 0.1 + index * 0.03 }}
                      className="p-4 rounded-2xl bg-card border border-border"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${status.color}20` }}
                        >
                          {getStatusIcon(status.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">
                              {formatInvoiceMonth(invoice.month, invoice.year)}
                            </h4>
                            <span 
                              className="text-xs font-medium px-2 py-1 rounded-full"
                              style={{ backgroundColor: `${status.color}20`, color: status.color }}
                            >
                              {status.message}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Vence em {parseLocalDate(invoice.dueDate).toLocaleDateString('pt-BR')}
                            {daysUntil > 0 && ` (${daysUntil} dias)`}
                          </p>
                        </div>
                      </div>

                      {/* Values */}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Valor total</p>
                          <p className="font-bold">{formatCurrency(invoice.closingBalance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Restante</p>
                          <p className="font-bold" style={{ color: remaining > 0 ? status.color : '#10B981' }}>
                            {formatCurrency(remaining)}
                          </p>
                        </div>
                      </div>

                      {/* Progress */}
                      {invoice.closingBalance > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Pago</span>
                            <span className="font-medium">{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      {/* Actions */}
                      {status.status !== 'PAGA' && (
                        <Button
                          className="w-full"
                          onClick={() => handleOpenPayment(invoice)}
                        >
                          Pagar Fatura
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {!isLoading && invoices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma fatura encontrada</p>
            </div>
          )}
        </div>

        {/* Payment Sheet */}
        <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Pagar Fatura</SheetTitle>
            </SheetHeader>

            {selectedInvoice && (
              <div className="space-y-6 mt-6">
                {/* Invoice Summary */}
                <div className="p-4 rounded-xl bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">
                    {selectedInvoice.card?.name} - {formatInvoiceMonth(selectedInvoice.month, selectedInvoice.year)}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(selectedInvoice.closingBalance - selectedInvoice.paidAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">restante para quitar</p>
                </div>

                <div className="space-y-2">
                  <Label>Valor do pagamento</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    placeholder="0,00"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentData({ 
                        ...paymentData, 
                        amount: selectedInvoice.minimumPayment.toFixed(2) 
                      })}
                    >
                      Mínimo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentData({ 
                        ...paymentData, 
                        amount: (selectedInvoice.closingBalance - selectedInvoice.paidAmount).toFixed(2) 
                      })}
                    >
                      Total
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pagar com</Label>
                  <Select
                    value={paymentData.accountId}
                    onValueChange={(v) => setPaymentData({ ...paymentData, accountId: v })}
                    disabled={!hasAccounts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={hasAccounts ? "Selecione a conta" : "Cadastre uma conta primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {formatCurrency(account.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!hasAccounts && (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    Você precisa de uma conta para pagar faturas.
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handlePay}
                  disabled={!paymentData.amount || !paymentData.accountId || payInvoice.isPending || !hasAccounts}
                >
                  Confirmar Pagamento
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
