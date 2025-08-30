import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { CommissionLogic, PrizeConfig } from '@/hooks/useLiveBingo';

interface CommissionStatusProps {
  commission: CommissionLogic;
  prizes: PrizeConfig[];
  className?: string;
  compact?: boolean;
}

const CommissionStatus: React.FC<CommissionStatusProps> = ({
  commission,
  prizes,
  className,
  compact = false
}) => {
  const progressPercentage = Math.min((commission.currentDonations / commission.minimumForFullPayout) * 100, 100);
  const isFullyFunded = commission.canPayAll;
  
  if (compact) {
    return (
      <Card className={cn("bg-amber-900/30 border-amber-600", className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-300 font-semibold text-sm">Status dos Prêmios</span>
            {isFullyFunded ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            )}
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-2 mb-2"
          />
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-300">Arrecadado:</span>
              <span className="text-white font-semibold">R$ {commission.currentDonations.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Necessário:</span>
              <span className="text-white font-semibold">R$ {commission.minimumForFullPayout.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-slate-800/80 border-slate-600", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          Status de Comissionamento
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Funding Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">
              Arrecadação ({commission.requiredPercentage}% necessário)
            </span>
            <Badge variant={isFullyFunded ? "default" : "destructive"} className="text-xs">
              {isFullyFunded ? "Completo" : "Parcial"}
            </Badge>
          </div>
          
          <Progress value={progressPercentage} className="h-3" />
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>R$ {commission.currentDonations.toFixed(2)}</span>
            <span>R$ {commission.minimumForFullPayout.toFixed(2)}</span>
          </div>
        </div>

        {/* Prize Distribution */}
        <div className="space-y-3">
          <h4 className="font-semibold text-amber-300 text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Distribuição de Prêmios
          </h4>
          
          {prizes.map(prize => (
            <div key={prize.level} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/50">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  prize.isPaid ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-sm font-medium text-white">{prize.name}</span>
                <span className="text-xs text-gray-400">R$ {prize.amount}</span>
              </div>
              
              <Badge 
                variant={prize.isPaid ? "default" : "outline"}
                className={cn(
                  "text-xs",
                  prize.isPaid 
                    ? "bg-green-600 border-green-600 text-white" 
                    : "border-red-400 text-red-300 bg-red-900/30"
                )}
              >
                {prize.isPaid ? "Jogadores" : "Sistema"}
              </Badge>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t border-slate-600 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Total de Prêmios:</span>
            <span className="text-white font-semibold">R$ {commission.totalPrizes.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Valor Pagável:</span>
            <span className="text-white font-semibold">R$ {commission.payableAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Status:</span>
            <span className={cn(
              "font-semibold",
              isFullyFunded ? "text-green-400" : "text-yellow-400"
            )}>
              {isFullyFunded ? "Todos os prêmios liberados" : "Pagamento parcial"}
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
          <p className="text-xs text-blue-200">
            <strong>Como funciona:</strong> Para liberar todos os prêmios aos jogadores reais, 
            é necessário arrecadar {commission.requiredPercentage}% do valor total dos prêmios. 
            Caso contrário, alguns prêmios ficam com o sistema.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionStatus;
