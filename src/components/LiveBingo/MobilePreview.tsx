import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface MobilePreviewProps {
  timeLeft: string;
  drawingId: string;
  donations: number;
  currentTime: string;
}

const MobilePreview: React.FC<MobilePreviewProps> = ({
  timeLeft,
  drawingId,
  donations,
  currentTime
}) => {
  const prizes = [
    { place: '1º PRÊMIO', icon: '🏆', amount: 'R$ 30,00' },
    { place: '2º PRÊMIO', icon: '🥈', amount: 'R$ 50,00' },
    { place: '3º PRÊMIO', icon: '🥉', amount: 'R$ 100,00' }
  ];

  return (
    <Card className="bg-slate-800/80 border-slate-600">
      <CardContent className="p-4">
        {/* Mini Header */}
        <div className="flex items-center justify-between mb-4">
          <Menu className="text-white" size={20} />
          <span className="text-white font-bold text-sm">SOR</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs px-3">
            Depositar
          </Button>
        </div>
        
        {/* Welcome Message */}
        <div className="text-center mb-4">
          <div className="text-blue-400 text-sm font-semibold">SEJA BEM-VINDO!!</div>
          <div className="text-gray-300 text-xs mt-1 space-y-1">
            <div>• Sorteios a cada 10 minutos</div>
            <div>• Bônus 24 horas por dia</div>
            <div>• Grande sorteio diário de</div>
            <div className="text-yellow-400 font-semibold">R$1.000 às 22h</div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-slate-700 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-4 gap-1 text-center mb-2">
            {timeLeft.split(':').map((unit, index) => (
              <React.Fragment key={index}>
                <div className="bg-white text-black font-bold text-lg rounded py-1 px-1">
                  {unit}
                </div>
                {index < 2 && (
                  <div className="text-yellow-400 text-lg font-bold flex items-center justify-center">
                    :
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Timer Info */}
          <div className="grid grid-cols-3 gap-4 text-xs text-center">
            <div>
              <div className="text-gray-400">Sorteio</div>
              <div className="text-white font-semibold">{drawingId}</div>
            </div>
            <div>
              <div className="text-gray-400">Doação</div>
              <div className="text-white font-semibold">R$ {donations.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">Hora</div>
              <div className="text-white font-semibold">{currentTime}</div>
            </div>
          </div>
        </div>

        {/* Prizes Display */}
        <div className="space-y-2">
          {prizes.map((prize, index) => (
            <div 
              key={index} 
              className="bg-blue-900/50 rounded-lg p-2 flex items-center justify-between hover:bg-blue-900/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{prize.icon}</span>
                <span className="text-white text-sm font-semibold">{prize.place}</span>
              </div>
              <span className="text-yellow-400 font-bold text-sm">{prize.amount}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MobilePreview;
