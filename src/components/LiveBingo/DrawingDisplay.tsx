import React from 'react';
import { cn } from '@/lib/utils';

interface DrawingDisplayProps {
  currentNumber: number;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const DrawingDisplay: React.FC<DrawingDisplayProps> = ({
  currentNumber,
  isActive = true,
  size = 'lg'
}) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32', 
    lg: 'w-48 h-48 lg:w-64 lg:h-64'
  };

  const innerSizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-40 h-40 lg:w-56 lg:h-56'
  };

  const textSizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl lg:text-8xl'
  };

  return (
    <div className="flex justify-center">
      <div className="relative">
        {/* Outer ring with glow effect */}
        <div className={cn(
          "rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl",
          "ring-4 ring-blue-300/50",
          sizeClasses[size],
          isActive && "animate-pulse"
        )}>
          {/* Inner number display */}
          <div className={cn(
            "rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center shadow-inner",
            innerSizeClasses[size]
          )}>
            <span className={cn(
              "font-black text-gray-900 drop-shadow-lg",
              textSizeClasses[size]
            )}>
              {currentNumber}
            </span>
          </div>
        </div>

        {/* Pulsing glow effect */}
        {isActive && (
          <div className={cn(
            "absolute inset-0 rounded-full bg-blue-400/30 animate-ping",
            sizeClasses[size]
          )} />
        )}

        {/* Rotating shine effect */}
        <div className={cn(
          "absolute inset-2 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent",
          "animate-spin",
          "opacity-50"
        )} 
        style={{ animationDuration: '3s' }} 
        />
      </div>
    </div>
  );
};

export default DrawingDisplay;
