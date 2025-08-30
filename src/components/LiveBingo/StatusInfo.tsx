import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusInfoProps {
  label: string;
  value: string | number;
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'slate';
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
}

const StatusInfo: React.FC<StatusInfoProps> = ({
  label,
  value,
  color = 'slate',
  textSize = 'lg'
}) => {
  const colorClasses = {
    red: 'bg-red-900/50 border-red-600 text-red-300',
    yellow: 'bg-yellow-900/50 border-yellow-600 text-yellow-300',
    green: 'bg-green-900/50 border-green-600 text-green-300',
    blue: 'bg-blue-900/50 border-blue-600 text-blue-300',
    slate: 'bg-slate-800/50 border-slate-600 text-gray-300'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <Card className={cn('transition-all duration-300 hover:scale-105', colorClasses[color])}>
      <CardContent className="p-4 text-center">
        <div className="font-semibold text-sm mb-1">{label}</div>
        <div className={cn(
          'text-white font-bold',
          textSizeClasses[textSize]
        )}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
};

// Pre-configured components for common statuses
export const DrawingInfo: React.FC<{ drawingId: string }> = ({ drawingId }) => (
  <StatusInfo label="Sorteio" value={drawingId} color="yellow" />
);

export const DonationInfo: React.FC<{ amount: number }> = ({ amount }) => (
  <StatusInfo label="Doação" value={`R$ ${amount.toFixed(2)}`} color="yellow" />
);

export const DateInfo: React.FC<{ date: string }> = ({ date }) => (
  <StatusInfo label="Data" value={date} color="slate" />
);

export const TimeInfo: React.FC<{ time: string }> = ({ time }) => (
  <StatusInfo label="Hora" value={time} color="slate" />
);

export const CouponInfo: React.FC<{ coupon: string }> = ({ coupon }) => (
  <StatusInfo label="CUPOM" value={coupon} color="red" textSize="xl" />
);

export const DonorInfo: React.FC<{ donor: string }> = ({ donor }) => (
  <StatusInfo label="DOADOR" value={donor} color="slate" textSize="sm" />
);

export const RemainingInfo: React.FC<{ remaining: number }> = ({ remaining }) => (
  <StatusInfo label="FALTAM" value={remaining} color="yellow" textSize="xl" />
);

export default StatusInfo;
