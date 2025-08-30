import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PrizeBlockProps {
  level: number;
  name: string;
  amount: number;
  isPaid: boolean;
  color?: string;
  isHighlighted?: boolean;
}

const PrizeBlock: React.FC<PrizeBlockProps> = ({
  level,
  name,
  amount,
  isPaid,
  color = 'bg-slate-800/50',
  isHighlighted = false
}) => {
  return (
    <Card className={cn(
      "border-2 transition-all duration-300 hover:scale-105",
      isPaid 
        ? "border-green-400 bg-green-900/30 shadow-green-500/20 shadow-lg" 
        : "border-yellow-500 bg-slate-800/50",
      isHighlighted && "border-blue-400 ring-2 ring-blue-400/30",
      "group relative overflow-hidden"
    )}>
      <CardContent className="p-4 text-center relative z-10">
        <h3 className="font-semibold text-sm text-gray-300 mb-1">{name}</h3>
        <div className="text-2xl font-bold text-white mb-2">
          R$ {amount.toFixed(2)}
        </div>
        {!isPaid && (
          <Badge variant="outline" className="text-xs border-red-400 text-red-300 bg-red-900/30">
            Sistema
          </Badge>
        )}
        {isPaid && (
          <Badge className="text-xs bg-green-600 text-white">
            Jogadores
          </Badge>
        )}
      </CardContent>
      
      {/* Glowing effect for paid prizes */}
      {isPaid && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 animate-pulse" />
      )}
      
      {/* Highlight effect */}
      {isHighlighted && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 animate-pulse" />
      )}
    </Card>
  );
};

export default PrizeBlock;
