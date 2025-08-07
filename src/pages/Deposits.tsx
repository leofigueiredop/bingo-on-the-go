import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  History
} from 'lucide-react';

interface Deposit {
  id: string;
  amount: number;
  bonus_amount: number;
  total_amount: number;
  status: 'pending' | 'completed' | 'failed';
  payment_method: string;
  created_at: string;
}

const DEPOSIT_AMOUNTS = [50, 100, 200, 500, 1000];
const BONUS_PERCENTAGE = 0.1; // 10% bonus

const Deposits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  useEffect(() => {
    fetchDeposits();
  }, [user]);

  const fetchDeposits = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar depósitos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateBonus = (amount: number): number => {
    return amount * BONUS_PERCENTAGE;
  };

  const calculateTotal = (amount: number): number => {
    return amount + calculateBonus(amount);
  };

  const processDeposit = async (amount: number) => {
    if (!user) return;
    
    setProcessing(true);
    
    try {
      const bonusAmount = calculateBonus(amount);
      const totalAmount = calculateTotal(amount);
      
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount,
          bonus_amount: bonusAmount,
          total_amount: totalAmount,
          payment_method: 'pix', // For now, only PIX
          status: 'pending',
        });

      if (error) throw error;
      
      toast({
        title: "Depósito iniciado",
        description: `Depósito de R$ ${amount.toFixed(2)} foi processado. Aguarde a confirmação.`,
      });
      
      // Simulate payment processing (in real app, this would be handled by payment gateway)
      setTimeout(async () => {
        // For demo purposes, automatically approve the deposit
        await completeDeposit(amount, bonusAmount, totalAmount);
      }, 3000);
      
      setSelectedAmount(null);
      setCustomAmount('');
      fetchDeposits();
    } catch (error: any) {
      toast({
        title: "Erro ao processar depósito",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const completeDeposit = async (amount: number, bonusAmount: number, totalAmount: number) => {
    if (!user) return;
    
    try {
      // Update user balance
      const { error: balanceError } = await supabase.rpc('add_balance', {
        user_id: user.id,
        amount: totalAmount
      });

      if (balanceError) throw balanceError;
      
      toast({
        title: "Depósito confirmado!",
        description: `R$ ${totalAmount.toFixed(2)} foi adicionado ao seu saldo (R$ ${bonusAmount.toFixed(2)} de bônus incluído).`,
      });
    } catch (error: any) {
      console.error('Error completing deposit:', error);
    }
  };

  const handleCustomDeposit = () => {
    const amount = parseFloat(customAmount);
    if (amount < 10) {
      toast({
        title: "Valor mínimo",
        description: "O valor mínimo para depósito é R$ 10,00.",
        variant: "destructive",
      });
      return;
    }
    if (amount > 10000) {
      toast({
        title: "Valor máximo",
        description: "O valor máximo para depósito é R$ 10.000,00.",
        variant: "destructive",
      });
      return;
    }
    processDeposit(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Depósitos</h1>
          <p className="text-muted-foreground">
            Adicione saldo à sua conta para participar dos jogos
          </p>
        </div>

        {/* Deposit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Fazer Depósito
            </CardTitle>
            <CardDescription>
              Ganhe {(BONUS_PERCENTAGE * 100).toFixed(0)}% de bônus em todos os depósitos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Amount Buttons */}
            <div>
              <Label className="text-base font-medium">Valores rápidos</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                {DEPOSIT_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? "default" : "outline"}
                    onClick={() => setSelectedAmount(amount)}
                    className="h-20 flex flex-col"
                  >
                    <div className="text-lg font-bold">R$ {amount}</div>
                    <div className="text-xs text-muted-foreground">
                      +R$ {calculateBonus(amount).toFixed(0)} bônus
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Ou digite um valor personalizado</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="10"
                  max="10000"
                  step="0.01"
                />
                <Button 
                  onClick={handleCustomDeposit}
                  disabled={!customAmount || processing}
                >
                  Depositar
                </Button>
              </div>
            </div>

            {/* Selected Amount Summary */}
            {selectedAmount && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Valor do depósito:</span>
                      <span className="font-medium">R$ {selectedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-success">
                      <span>Bônus ({(BONUS_PERCENTAGE * 100).toFixed(0)}%):</span>
                      <span className="font-medium">R$ {calculateBonus(selectedAmount).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total a receber:</span>
                        <span>R$ {calculateTotal(selectedAmount).toFixed(2)}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => processDeposit(selectedAmount)}
                      disabled={processing}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {processing ? 'Processando...' : 'Confirmar Depósito via PIX'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Deposit History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Depósitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Nenhum depósito ainda</h3>
                <p className="text-muted-foreground">
                  Faça seu primeiro depósito para começar a jogar!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(deposit.status)}
                      <div>
                        <div className="font-medium">
                          R$ {deposit.amount.toFixed(2)}
                          {deposit.bonus_amount > 0 && (
                            <span className="text-success text-sm ml-2">
                              (+R$ {deposit.bonus_amount.toFixed(2)} bônus)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(deposit.created_at).toLocaleString('pt-BR')} • {deposit.payment_method.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getStatusVariant(deposit.status)}>
                        {getStatusText(deposit.status)}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        Total: R$ {deposit.total_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Deposits;