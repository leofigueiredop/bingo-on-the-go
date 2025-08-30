import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NumberGridProps {
  totalNumbers?: number;
  drawnNumbers: number[];
  currentNumber?: number;
  onNumberClick?: (number: number) => void;
}

const NumberGrid: React.FC<NumberGridProps> = ({
  totalNumbers = 90,
  drawnNumbers,
  currentNumber,
  onNumberClick
}) => {
  return (
    <Card className="bg-slate-800/30 border-slate-600">
      <CardContent className="p-4">
        <div className="grid grid-cols-10 gap-1 lg:gap-2">
          {Array.from({ length: totalNumbers }, (_, i) => i + 1).map((number) => {
            const isDrawn = drawnNumbers.includes(number);
            const isCurrent = number === currentNumber;
            
            return (
              <button
                key={number}
                onClick={() => onNumberClick?.(number)}
                className={cn(
                  "aspect-square flex items-center justify-center text-xs lg:text-sm font-bold rounded transition-all duration-300 relative",
                  "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400",
                  isCurrent
                    ? "bg-red-600 text-white scale-110 shadow-lg ring-2 ring-red-400 animate-pulse z-10"
                    : isDrawn
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white"
                )}
                disabled={isDrawn}
              >
                <span className="relative z-10">{number}</span>
                
                {/* Glowing effect for current number */}
                {isCurrent && (
                  <div className="absolute inset-0 bg-red-500 rounded opacity-50 animate-ping" />
                )}
                
                {/* Subtle shine effect for drawn numbers */}
                {isDrawn && !isCurrent && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default NumberGrid;
