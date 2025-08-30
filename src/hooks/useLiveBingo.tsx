import { useState, useEffect, useCallback } from 'react';

// Types
export interface PrizeConfig {
  level: number;
  name: string;
  amount: number;
  isPaid: boolean;
  color: string;
  winners?: string[];
}

export interface LiveBingoDrawing {
  id: string;
  currentNumber: number | null;
  drawNumbers: number[];
  prizes: PrizeConfig[];
  totalPool: number;
  donations: number;
  nextDrawTime: Date;
  status: 'waiting' | 'drawing' | 'finished';
  coupon: string;
  donor: string;
  remaining: number;
}

export interface CommissionLogic {
  requiredPercentage: number;
  minimumForFullPayout: number;
  currentDonations: number;
  totalPrizes: number;
  payableAmount: number;
  canPayAll: boolean;
}

export interface LiveBingoConfig {
  drawIntervalMinutes: number;
  requiredCommissionPercentage: number;
  totalNumbers: number;
  defaultPrizes: Omit<PrizeConfig, 'isPaid' | 'winners'>[];
}

// Default configuration
const DEFAULT_CONFIG: LiveBingoConfig = {
  drawIntervalMinutes: 10,
  requiredCommissionPercentage: 200, // 200% = entrada deve ser 2x o valor dos prêmios
  totalNumbers: 90,
  defaultPrizes: [
    { level: 1, name: 'Prêmio 1', amount: 20, color: 'bg-amber-500' },
    { level: 2, name: 'Prêmio 2', amount: 30, color: 'bg-pink-500' },
    { level: 3, name: 'Prêmio 3', amount: 60, color: 'bg-blue-600' },
  ]
};

export function useLiveBingo(config: Partial<LiveBingoConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Initial state
  const [drawing, setDrawing] = useState<LiveBingoDrawing>({
    id: generateDrawingId(),
    currentNumber: 66,
    drawNumbers: [1, 2, 3, 7, 8, 9, 10, 11, 12, 16, 17, 23, 25, 26, 27, 31, 32, 35, 36, 39, 40, 41, 48, 49, 52, 55, 56, 57, 62, 66, 69, 70, 71, 72, 76, 77, 78, 79, 82, 85, 86],
    prizes: finalConfig.defaultPrizes.map(p => ({ ...p, isPaid: false, winners: [] })),
    totalPool: 110,
    donations: 0.10,
    nextDrawTime: new Date(Date.now() + 4 * 60 * 1000 + 39 * 1000), // 4:39 from now
    status: 'drawing',
    coupon: '138137',
    donor: 'Francisco lucicleiton da',
    remaining: 37
  });

  const [timeLeft, setTimeLeft] = useState<string>('00:04:39');

  // Commission logic calculation
  const calculateCommissionStatus = useCallback((): CommissionLogic => {
    const totalPrizes = drawing.prizes.reduce((sum, prize) => sum + prize.amount, 0);
    const minimumForFullPayout = totalPrizes * (finalConfig.requiredCommissionPercentage / 100);
    const canPayAll = drawing.donations >= minimumForFullPayout;
    
    return {
      requiredPercentage: finalConfig.requiredCommissionPercentage,
      minimumForFullPayout,
      currentDonations: drawing.donations,
      totalPrizes,
      payableAmount: Math.min(drawing.donations, totalPrizes),
      canPayAll
    };
  }, [drawing.donations, drawing.prizes, finalConfig.requiredCommissionPercentage]);

  // Determine which prizes can be paid to real players
  const getPayablePrizes = useCallback((): PrizeConfig[] => {
    const commission = calculateCommissionStatus();
    
    if (commission.canPayAll) {
      // Pay all prizes to real players
      return drawing.prizes.map(prize => ({ ...prize, isPaid: true }));
    }
    
    // Pay only what we can afford, prioritize lower prizes first
    let remainingFunds = commission.payableAmount;
    const sortedPrizes = [...drawing.prizes].sort((a, b) => a.amount - b.amount);
    const paymentMap = new Map<number, boolean>();
    
    for (const prize of sortedPrizes) {
      if (remainingFunds >= prize.amount) {
        remainingFunds -= prize.amount;
        paymentMap.set(prize.level, true);
      } else {
        paymentMap.set(prize.level, false);
      }
    }
    
    return drawing.prizes.map(prize => ({
      ...prize,
      isPaid: paymentMap.get(prize.level) || false
    }));
  }, [drawing.prizes, calculateCommissionStatus]);

  // Simulate receiving a donation
  const addDonation = useCallback((amount: number) => {
    setDrawing(prev => ({
      ...prev,
      donations: prev.donations + amount,
      totalPool: prev.totalPool + amount
    }));
  }, []);

  // Update prize configuration
  const updatePrizes = useCallback((newPrizes: Omit<PrizeConfig, 'isPaid' | 'winners'>[]) => {
    setDrawing(prev => ({
      ...prev,
      prizes: newPrizes.map(p => ({ ...p, isPaid: false, winners: [] }))
    }));
  }, []);

  // Start a new drawing
  const startNewDrawing = useCallback(() => {
    setDrawing(prev => ({
      ...prev,
      id: generateDrawingId(),
      currentNumber: null,
      drawNumbers: [],
      donations: 0,
      totalPool: 0,
      nextDrawTime: new Date(Date.now() + finalConfig.drawIntervalMinutes * 60 * 1000),
      status: 'waiting',
      prizes: finalConfig.defaultPrizes.map(p => ({ ...p, isPaid: false, winners: [] })),
      coupon: generateCoupon(),
      remaining: finalConfig.totalNumbers
    }));
  }, [finalConfig]);

  // Draw next number
  const drawNextNumber = useCallback(() => {
    setDrawing(prev => {
      const availableNumbers = Array.from(
        { length: finalConfig.totalNumbers }, 
        (_, i) => i + 1
      ).filter(n => !prev.drawNumbers.includes(n));
      
      if (availableNumbers.length === 0) {
        return { ...prev, status: 'finished' };
      }
      
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const newNumber = availableNumbers[randomIndex];
      
      return {
        ...prev,
        currentNumber: newNumber,
        drawNumbers: [...prev.drawNumbers, newNumber],
        remaining: prev.remaining - 1,
        nextDrawTime: new Date(Date.now() + 10 * 1000), // Next number in 10 seconds
      };
    });
  }, [finalConfig.totalNumbers]);

  // Add winner to prize
  const addWinner = useCallback((prizeLevel: number, winner: string) => {
    setDrawing(prev => ({
      ...prev,
      prizes: prev.prizes.map(prize =>
        prize.level === prizeLevel
          ? { ...prize, winners: [...(prize.winners || []), winner] }
          : prize
      )
    }));
  }, []);

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = drawing.nextDrawTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        if (drawing.status === 'waiting') {
          setDrawing(prev => ({ ...prev, status: 'drawing' }));
        }
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [drawing.nextDrawTime, drawing.status]);

  // Auto-draw numbers during drawing phase
  useEffect(() => {
    if (drawing.status === 'drawing') {
      const interval = setInterval(() => {
        drawNextNumber();
      }, 10000); // Draw every 10 seconds

      return () => clearInterval(interval);
    }
  }, [drawing.status, drawNextNumber]);

  return {
    // State
    drawing,
    timeLeft,
    config: finalConfig,
    
    // Computed values
    commissionStatus: calculateCommissionStatus(),
    payablePrizes: getPayablePrizes(),
    
    // Actions
    addDonation,
    updatePrizes,
    startNewDrawing,
    drawNextNumber,
    addWinner,
    
    // Utils
    isNumberDrawn: (number: number) => drawing.drawNumbers.includes(number),
    isCurrentNumber: (number: number) => drawing.currentNumber === number,
    getDrawnPercentage: () => (drawing.drawNumbers.length / finalConfig.totalNumbers) * 100,
  };
}

// Helper functions
function generateDrawingId(): string {
  return Math.random().toString().substr(2, 6);
}

function generateCoupon(): string {
  return Math.random().toString().substr(2, 6);
}

export default useLiveBingo;
