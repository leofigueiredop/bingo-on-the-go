import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Menu, ArrowLeft } from 'lucide-react';
import useLiveBingo from '@/hooks/useLiveBingo';
import DrawingDisplay from './DrawingDisplay';
import PrizeBlock from './PrizeBlock';
import NumberGrid from './NumberGrid';

const MobileLiveBingo: React.FC = () => {
  const {
    drawing,
    timeLeft,
    payablePrizes,
    addDonation,
    drawNextNumber
  } = useLiveBingo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Mobile Header */}
      <header className="flex items-center justify-between p-4 bg-blue-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-white font-bold text-sm">SOR</span>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 text-sm">
          Depositar
        </Button>
      </header>

      <div className="p-4 space-y-4">
        {/* Welcome Section */}
        <Card className="bg-slate-800/80 border-slate-600">
          <CardContent className="p-4 text-center">
            <div className="text-blue-400 text-sm font-semibold">SEJA BEM-VINDO!!</div>
            <div className="text-gray-300 text-xs mt-1 space-y-1">
              <div>• Sorteios a cada 10 minutos</div>
              <div>• Bônus 24 horas por dia</div>
              <div>• Grande sorteio diário de</div>
              <div className="text-yellow-400 font-semibold">R$1.000 às 22h</div>
            </div>
          </CardContent>
        </Card>

        {/* Countdown Timer */}
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              {timeLeft.split(':').map((unit, index) => (
                <React.Fragment key={index}>
                  <div className="bg-white text-black font-bold text-xl rounded py-2">
                    {unit}
                  </div>
                  {index < 2 && (
                    <div className="text-yellow-400 text-xl font-bold flex items-center justify-center">
                      :
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-xs text-center">
              <div>
                <div className="text-gray-400">Sorteio</div>
                <div className="text-white font-semibold">{drawing.id}</div>
              </div>
              <div>
                <div className="text-gray-400">Doação</div>
                <div className="text-white font-semibold">R$ {drawing.donations.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400">Hora</div>
                <div className="text-white font-semibold">21/12 18:20</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prizes */}
        <div className="space-y-3">
          {[
            { place: '1º PRÊMIO', icon: '🏆', amount: 'R$ 30,00', color: 'from-yellow-400 to-yellow-600' },
            { place: '2º PRÊMIO', icon: '🥈', amount: 'R$ 50,00', color: 'from-gray-400 to-gray-600' },
            { place: '3º PRÊMIO', icon: '🥉', amount: 'R$ 100,00', color: 'from-amber-600 to-amber-800' }
          ].map((prize, index) => (
            <Card key={index} className="bg-blue-900/50 border-blue-600/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${prize.color} flex items-center justify-center text-lg`}>
                    {prize.icon}
                  </div>
                  <span className="text-white font-semibold">{prize.place}</span>
                </div>
                <span className="text-yellow-400 font-bold">{prize.amount}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Current Number Display */}
        <div className="py-6">
          <DrawingDisplay 
            currentNumber={drawing.currentNumber || 0}
            isActive={drawing.status === 'drawing'}
            size="md"
          />
        </div>

        {/* Compact Numbers Grid */}
        <Card className="bg-slate-800/30 border-slate-600">
          <CardContent className="p-3">
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => {
                const isDrawn = drawing.drawNumbers.includes(number);
                const isCurrent = number === drawing.currentNumber;
                
                return (
                  <div
                    key={number}
                    className={`
                      aspect-square flex items-center justify-center text-xs font-bold rounded transition-all duration-300
                      ${isCurrent
                        ? 'bg-red-600 text-white scale-110 shadow-lg ring-1 ring-red-400'
                        : isDrawn
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-gray-300'
                      }
                    `}
                  >
                    {number}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Status Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Card className="bg-red-900/50 border-red-600">
            <CardContent className="p-3">
              <div className="text-red-300 font-semibold text-xs">CUPOM</div>
              <div className="text-white font-bold text-lg">{drawing.coupon}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-3">
              <div className="text-gray-300 font-semibold text-xs">DOADOR</div>
              <div className="text-white font-bold text-xs truncate">{drawing.donor}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-900/50 border-yellow-600">
            <CardContent className="p-3">
              <div className="text-yellow-300 font-semibold text-xs">FALTAM</div>
              <div className="text-white font-bold text-lg">{drawing.remaining}</div>
            </CardContent>
          </Card>
        </div>

        {/* Test Actions - Development only */}
        <div className="grid grid-cols-2 gap-2 mt-6">
          <Button 
            onClick={() => addDonation(10)} 
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            +R$ 10
          </Button>
          <Button 
            onClick={drawNextNumber} 
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            Sortear
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileLiveBingo;
