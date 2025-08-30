import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

// Import custom components and hooks
import useLiveBingo from '@/hooks/useLiveBingo';
import PrizeBlock from '@/components/LiveBingo/PrizeBlock';
import NumberGrid from '@/components/LiveBingo/NumberGrid';
import DrawingDisplay from '@/components/LiveBingo/DrawingDisplay';
import MobilePreview from '@/components/LiveBingo/MobilePreview';
import MobileLiveBingo from '@/components/LiveBingo/MobileLiveBingo';
import CommissionStatus from '@/components/LiveBingo/CommissionStatus';
import { 
  DrawingInfo, 
  DonationInfo, 
  DateInfo, 
  TimeInfo, 
  CouponInfo, 
  DonorInfo, 
  RemainingInfo 
} from '@/components/LiveBingo/StatusInfo';
import { useIsMobile } from '@/hooks/use-mobile';

// Prize ball colors for side display
const PRIZE_BALL_COLORS = [
  'bg-gradient-to-br from-yellow-400 to-yellow-600',
  'bg-gradient-to-br from-pink-400 to-pink-600', 
  'bg-gradient-to-br from-purple-400 to-purple-600',
  'bg-gradient-to-br from-green-400 to-green-600',
  'bg-gradient-to-br from-blue-400 to-blue-600',
];

const LiveBingo: React.FC = () => {
  const {
    drawing,
    timeLeft,
    commissionStatus,
    payablePrizes,
    addDonation,
    drawNextNumber,
    isNumberDrawn,
    isCurrentNumber
  } = useLiveBingo();

  const isMobile = useIsMobile();

  // Render mobile version on small screens
  if (isMobile) {
    return <MobileLiveBingo />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-blue-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg lg:text-xl font-bold">SORTEIO AO VIVO</h1>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6">
          Depositar
        </Button>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Desktop 3 cols, Mobile full width */}
          <div className="lg:col-span-3 space-y-6">
            {/* Prizes Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {payablePrizes.map((prize, index) => (
                <PrizeBlock 
                  key={prize.level}
                  level={prize.level}
                  name={prize.name}
                  amount={prize.amount}
                  isPaid={prize.isPaid}
                  color={prize.color}
                  isHighlighted={index === 2} // Highlight Prize 3
                />
              ))}
            </div>

            {/* Drawing Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DrawingInfo drawingId={drawing.id} />
              <DonationInfo amount={drawing.donations} />
              <DateInfo date="13/12/2024" />
              <TimeInfo time="21:20:00" />
            </div>

            {/* Main Drawing Number */}
            <div className="my-8">
              <DrawingDisplay 
                currentNumber={drawing.currentNumber || 0}
                isActive={drawing.status === 'drawing'}
                size="lg"
              />
            </div>

            {/* Numbers Grid */}
            <NumberGrid 
              totalNumbers={90}
              drawnNumbers={drawing.drawNumbers}
              currentNumber={drawing.currentNumber || undefined}
              onNumberClick={() => {}} // Disabled for now
            />

            {/* Bottom Status */}
            <div className="grid grid-cols-3 gap-4">
              <CouponInfo coupon={drawing.coupon} />
              <DonorInfo donor={drawing.donor} />
              <RemainingInfo remaining={drawing.remaining} />
            </div>
          </div>

          {/* Side Panel - Desktop only */}
          <div className="hidden lg:block space-y-4">
            {/* Mobile-style Mini Display */}
            <MobilePreview 
              timeLeft={timeLeft}
              drawingId={drawing.id}
              donations={drawing.donations}
              currentTime="21/12 18:20"
            />

            {/* Side Balls */}
            <div className="space-y-3">
              {drawing.drawNumbers.slice(-5).map((number, index) => (
                <div key={number} className="flex justify-center">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-300 hover:scale-110",
                    PRIZE_BALL_COLORS[index % PRIZE_BALL_COLORS.length]
                  )}>
                    {number}
                  </div>
                </div>
              ))}
            </div>

            {/* Commission Status Info */}
            <CommissionStatus 
              commission={commissionStatus}
              prizes={payablePrizes}
              compact={true}
            />

            {/* Action Buttons for Testing */}
            <div className="space-y-2">
              <Button 
                onClick={() => addDonation(10)} 
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                Simular Doação (+R$ 10)
              </Button>
              <Button 
                onClick={drawNextNumber} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                Sortear Próximo Número
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveBingo;
