import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BingoRoom {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  current_players: number;
  max_players: number;
  card_price: number;
  current_number?: number;
  called_numbers: number[];
  prizes: {
    bingo: number;
    quina: number;
    quadra: number;
  };
  next_number_at?: string;
  auto_start_at?: string;
  start_time?: string;
  end_time?: string;
}

interface BingoCard {
  id: string;
  user_id: string;
  room_id: string;
  numbers: number[];
  marked_positions: number[];
  has_quadra: boolean;
  has_quina: boolean;
  has_bingo: boolean;
}

interface Winner {
  user_id: string;
  username: string;
  prize_type: 'quadra' | 'quina' | 'bingo';
  prize_amount: number;
}

interface UseBingoGameReturn {
  room: BingoRoom | null;
  winners: Winner[];
  loading: boolean;
  error: string | null;
  timeUntilNext: number;
  loadRoom: (roomId: string) => Promise<void>;
  startGame: (roomId: string) => Promise<void>;
  drawNextNumber: (roomId: string) => Promise<void>;
  endGame: (roomId: string) => Promise<void>;
  setupGameSubscription: (roomId: string) => () => void;
  generatePrizePool: (room: BingoRoom) => { quadra: number; quina: number; bingo: number };
}

const BINGO_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1);
const DRAW_INTERVAL = 10000; // 10 seconds between numbers

export function useBingoGame(): UseBingoGameReturn {
  const [room, setRoom] = useState<BingoRoom | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState(0);
  const { toast } = useToast();
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial room state
  const loadRoom = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('bingo_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (error) throw error;
      setRoom(data as BingoRoom);
    } catch (err) {
      // swallow, caller does error handling
    }
  }, []);

  // Calculate prize pool based on players and card price
  const generatePrizePool = useCallback((room: BingoRoom) => {
    const totalPool = room.current_players * room.card_price;
    const quadra = Math.floor(totalPool * 0.1); // 10% for quadra
    const quina = Math.floor(totalPool * 0.25); // 25% for quina
    const bingo = Math.floor(totalPool * 0.5); // 50% for bingo
    
    return { quadra, quina, bingo };
  }, []);

  // Start game automatically when minimum players reached
  const startGame = useCallback(async (roomId: string) => {
    // Carrega estado mais recente da sala para evitar race
    const { data: latest } = await supabase
      .from('bingo_rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();
    if (!latest || latest.status !== 'waiting') return;
    
    setLoading(true);
    try {
      const prizePool = generatePrizePool(latest as BingoRoom);
      const startTime = new Date();
      const firstNumberTime = new Date(startTime.getTime() + 5000); // First number in 5 seconds

      const { error } = await supabase
        .from('bingo_rooms')
        .update({
          status: 'playing',
          start_time: startTime.toISOString(),
          next_number_at: firstNumberTime.toISOString(),
          prizes: prizePool,
          called_numbers: [],
          current_number: null
        })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "🎉 Jogo iniciado!",
        description: "O sorteio começará em 5 segundos. Boa sorte!",
      });

      // Start automatic number drawing
      setTimeout(() => {
        gameIntervalRef.current = setInterval(() => {
          drawNextNumber(roomId);
        }, DRAW_INTERVAL);
      }, 5000);

    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro ao iniciar jogo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [room, generatePrizePool, toast]);

  // Draw next number in sequence
  const drawNextNumber = useCallback(async (roomId: string) => {
    try {
      // Sorteio único via RPC no servidor (consistente para todos)
      const { data: drawn, error } = await supabase.rpc('draw_next_number', {
        p_room_id: roomId,
      });
      if (error) throw error;
      // Verificação de ganhadores acontece logo após
      setTimeout(() => checkForWinners(roomId), 1000);
    } catch (err: any) {
      setError(err.message);
      console.error('Error drawing number:', err);
    }
  }, []);

  // Check for winners and distribute prizes
  const checkForWinners = useCallback(async (roomId: string) => {
    try {
      // Get all cards for this room
      const { data: cards, error: cardsError } = await supabase
        .from('bingo_cards')
        .select(`
          *,
          profiles!inner(username)
        `)
        .eq('room_id', roomId);

      if (cardsError) throw cardsError;

      const { data: currentRoom } = await supabase
        .from('bingo_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!currentRoom) return;

      const newWinners: Winner[] = [];

      // Check each card for wins
      for (const cardData of cards || []) {
        const card = cardData as BingoCard & { profiles: { username: string } };
        
        // Check for new quadra
        if (!card.has_quadra && checkQuadra(card.marked_positions)) {
          newWinners.push({
            user_id: card.user_id,
            username: card.profiles.username,
            prize_type: 'quadra',
            prize_amount: currentRoom.prizes.quadra || 0
          });

          // Update card and add balance
          await Promise.all([
            supabase.from('bingo_cards').update({ has_quadra: true }).eq('id', card.id),
            supabase.rpc('add_balance', { 
              user_id: card.user_id, 
              amount: currentRoom.prizes.quadra || 0 
            })
          ]);
        }

        // Check for new quina
        if (!card.has_quina && checkQuina(card.marked_positions)) {
          newWinners.push({
            user_id: card.user_id,
            username: card.profiles.username,
            prize_type: 'quina',
            prize_amount: currentRoom.prizes.quina || 0
          });

          await Promise.all([
            supabase.from('bingo_cards').update({ has_quina: true }).eq('id', card.id),
            supabase.rpc('add_balance', { 
              user_id: card.user_id, 
              amount: currentRoom.prizes.quina || 0 
            })
          ]);
        }

        // Check for new bingo
        if (!card.has_bingo && checkBingo(card.marked_positions)) {
          newWinners.push({
            user_id: card.user_id,
            username: card.profiles.username,
            prize_type: 'bingo',
            prize_amount: currentRoom.prizes.bingo || 0
          });

          await Promise.all([
            supabase.from('bingo_cards').update({ has_bingo: true }).eq('id', card.id),
            supabase.rpc('add_balance', { 
              user_id: card.user_id, 
              amount: currentRoom.prizes.bingo || 0 
            })
          ]);

          // End game when someone gets bingo
          setTimeout(() => endGame(roomId), 3000);
        }
      }

      // Notify winners
      newWinners.forEach(winner => {
        toast({
          title: `🎉 ${winner.username} ganhou ${winner.prize_type.toUpperCase()}!`,
          description: `Prêmio: R$ ${winner.prize_amount.toFixed(2)}`,
        });
      });

      setWinners(prev => [...prev, ...newWinners]);

    } catch (err: any) {
      console.error('Error checking winners:', err);
    }
  }, [toast]);

  // End game and cleanup
  const endGame = useCallback(async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('bingo_rooms')
        .update({
          status: 'finished',
          end_time: new Date().toISOString(),
          next_number_at: null
        })
        .eq('id', roomId);

      if (error) throw error;

      // Clear intervals
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast({
        title: "🏁 Jogo finalizado!",
        description: "Obrigado por jogar. Uma nova sala será criada em breve.",
      });

    } catch (err: any) {
      setError(err.message);
      console.error('Error ending game:', err);
    }
  }, [toast]);

  // Setup real-time subscription for game updates
  const setupGameSubscription = useCallback((roomId: string) => {
    const channel = supabase
      .channel(`game_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bingo_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updatedRoom = payload.new as BingoRoom;
          setRoom(updatedRoom);

          // Auto-start logic robusta: agenda ou inicia se prazo passou
          if (updatedRoom.status === 'waiting' && updatedRoom.current_players >= 2) {
            const now = Date.now();
            const hasSchedule = Boolean(updatedRoom.auto_start_at);
            const scheduleMs = updatedRoom.auto_start_at ? new Date(updatedRoom.auto_start_at!).getTime() : 0;

            // Se não há agendamento ou já passou do prazo, reagendar para +30s
            if (!hasSchedule || scheduleMs <= now) {
              const autoStartTime = new Date(now + 30000);
              supabase
                .from('bingo_rooms')
                .update({ auto_start_at: autoStartTime.toISOString() })
                .eq('id', roomId);

              toast({
                title: "🚀 Jogo iniciará em breve",
                description: "Mínimo de jogadores atingido. O jogo começará em 30 segundos!",
              });

              if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
              startTimeoutRef.current = setTimeout(() => startGame(roomId), 30000);
            } else {
              // Se há agendamento no futuro, agenda localmente se ainda não agendado
              const delay = Math.max(0, scheduleMs - now);
              if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
              startTimeoutRef.current = setTimeout(() => startGame(roomId), delay);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    };
  }, [startGame, toast]);

  // Timer for countdown
  useEffect(() => {
    if (room?.next_number_at) {
      const updateTimer = () => {
        const now = Date.now();
        const nextTime = new Date(room.next_number_at!).getTime();
        const diff = Math.max(0, Math.floor((nextTime - now) / 1000));
        setTimeUntilNext(diff);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [room?.next_number_at]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    room,
    winners,
    loading,
    error,
    timeUntilNext,
    loadRoom,
    startGame,
    drawNextNumber,
    endGame,
    setupGameSubscription,
    generatePrizePool
  };
}

// Helper functions for checking wins
function checkQuadra(markedPositions: number[]): boolean {
  const corners = [0, 4, 20, 24];
  return corners.every(pos => markedPositions.includes(pos));
}

function checkQuina(markedPositions: number[]): boolean {
  const lines = [
    // Rows
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    // Columns  
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
    // Diagonals
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
  ];

  return lines.some(line => 
    line.every(pos => markedPositions.includes(pos) || pos === 12) // 12 is free space
  );
}

function checkBingo(markedPositions: number[]): boolean {
  return markedPositions.length >= 24; // All numbers except free space
}