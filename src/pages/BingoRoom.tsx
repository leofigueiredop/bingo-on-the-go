import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useBingoGame } from '@/hooks/useBingoGame';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  ArrowLeft, 
  Users, 
  Crown,
  MessageCircle,
  Volume2,
  VolumeX,
  Play,
  Timer,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BingoCard {
  id: string;
  numbers: number[];
  marked_positions: number[];
  has_quadra: boolean;
  has_quina: boolean;
  has_bingo: boolean;
}

interface BingoRoom {
  id: string;
  name: string;
  status: string;
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
}

interface ChatMessage {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

const BINGO_COLUMNS = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

const BingoRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef<boolean>(false);
  const isJoiningRef = useRef<boolean>(false);
  const cardRef = useRef<BingoCard | null>(null);
  const roomStatusRef = useRef<string | null>(null);
  
  const {
    room,
    winners,
    loading: gameLoading,
    timeUntilNext,
    startGame,
    setupGameSubscription,
    loadRoom
  } = useBingoGame();
  
  const [card, setCard] = useState<BingoCard | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // keep refs in sync without triggering effects
  useEffect(() => {
    cardRef.current = card;
  }, [card]);
  useEffect(() => {
    roomStatusRef.current = room?.status ?? null;
  }, [room?.status]);

  useEffect(() => {
    if (!roomId || !user) return;
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Carrega estado inicial da sala para evitar tela vazia até o primeiro UPDATE
    loadRoom(roomId);

    fetchRoomData();
    const cleanupChat = setupRealtimeSubscriptions();
    const unsubscribe = setupGameSubscription(roomId);
    
    return () => {
      // Se o usuário sair antes do jogo começar, libera a vaga e remove a cartela
      if (cardRef.current && roomStatusRef.current === 'waiting') {
        void supabase.rpc('leave_room', { room_id: roomId, user_id: user.id });
      }
      cleanupChat?.();
      unsubscribe();
    };
  }, [roomId, user, setupGameSubscription, loadRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRoomData = async () => {
    if (!roomId || !user) return;
    
    try {
      // Fetch room data
      const { data: roomData, error: roomError } = await supabase
        .from('bingo_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

              if (roomError) throw roomError;

      // Fetch or create user's card
      let { data: cardData, error: cardError } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (cardError && cardError.code !== 'PGRST116') throw cardError;

      if (!cardData) {
        if (isJoiningRef.current) return; // evita múltiplas entradas simultâneas
        isJoiningRef.current = true;

        try {
          // Usa RPC transacional: enter_room(p_room_id, p_user_id, p_numbers, p_amount)
          const newCard = generateBingoCard();
          const { data, error } = await supabase.rpc('enter_room', {
            p_room_id: roomId,
            p_user_id: user.id,
            p_numbers: newCard,
            p_amount: roomData.card_price,
          });
          if (error) throw error;
          cardData = data as any;
        } catch (err: any) {
          toast({
            title: 'Erro ao entrar na sala',
            description: err.message || 'Tente novamente em instantes.',
            variant: 'destructive',
          });
          navigate('/');
          isJoiningRef.current = false;
          return;
        }

        isJoiningRef.current = false;
      }

      setCard(cardData);

      // Fetch chat messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          created_at,
          profiles!inner(username)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar sala",
        description: error.message,
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!roomId) return;

    // Subscribe to chat messages
    const chatChannel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the new message with user data
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              id,
              message,
              created_at,
              profiles!inner(username)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      chatChannel.unsubscribe();
    };
  };

  const generateBingoCard = (): number[] => {
    const card: number[] = [];
    
    // Generate numbers for each column
    Object.values(BINGO_COLUMNS).forEach(([min, max]) => {
      const columnNumbers: number[] = [];
      while (columnNumbers.length < 5) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!columnNumbers.includes(num)) {
          columnNumbers.push(num);
        }
      }
      card.push(...columnNumbers.sort((a, b) => a - b));
    });

    // Set center as FREE space (index 12)
    card[12] = 0; // 0 represents FREE space
    
    return card;
  };

  const markNumber = async (index: number) => {
    if (!card || !room || room.status !== 'playing') return;
    
    const number = card.numbers[index];
    if (number === 0 || card.marked_positions.includes(index)) return;
    
    // Check if this number was called
    if (!room.called_numbers.includes(number)) {
      toast({
        title: "Número não foi sorteado",
        description: `O número ${number} ainda não foi chamado.`,
        variant: "destructive",
      });
      return;
    }

    const newMarked = [...card.marked_positions, index];
    
    // Check for wins
    const hasQuadra = checkQuadra(newMarked);
    const hasQuina = checkQuina(newMarked);
    const hasBingo = checkBingo(newMarked);

    try {
      const { error } = await supabase
        .from('bingo_cards')
        .update({
          marked_positions: newMarked,
          has_quadra: hasQuadra,
          has_quina: hasQuina,
          has_bingo: hasBingo,
        })
        .eq('id', card.id);

      if (error) throw error;

      setCard({
        ...card,
        marked_positions: newMarked,
        has_quadra: hasQuadra,
        has_quina: hasQuina,
        has_bingo: hasBingo,
      });

      if (hasBingo && !card.has_bingo) {
        toast({
          title: "🎉 BINGO! 🎉",
          description: `Parabéns! Você ganhou R$ ${room.prizes.bingo}!`,
        });
      } else if (hasQuina && !card.has_quina) {
        toast({
          title: "🎉 QUINA! 🎉",
          description: `Parabéns! Você ganhou R$ ${room.prizes.quina}!`,
        });
      } else if (hasQuadra && !card.has_quadra) {
        toast({
          title: "🎉 QUADRA! 🎉",
          description: `Parabéns! Você ganhou R$ ${room.prizes.quadra}!`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao marcar número",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkQuadra = (markedPositions: number[]): boolean => {
    // Check corners: 0, 4, 20, 24
    const corners = [0, 4, 20, 24];
    return corners.every(pos => markedPositions.includes(pos));
  };

  const checkQuina = (markedPositions: number[]): boolean => {
    // Check any complete row, column, or diagonal
    const lines = [
      // Rows
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      // Columns
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      // Diagonals
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ];

    return lines.some(line => 
      line.every(pos => markedPositions.includes(pos) || pos === 12) // 12 is free space
    );
  };

  const checkBingo = (markedPositions: number[]): boolean => {
    // For now, bingo = full card (all 24 numbers + free space)
    return markedPositions.length >= 24;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !roomId || !user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          message: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getColumnLetter = (index: number): string => {
    const col = index % 5;
    return ['B', 'I', 'N', 'G', 'O'][col];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!room || !card) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12 text-center">
          <CardContent>
            <h3 className="text-xl font-semibold mb-2">Sala não encontrada</h3>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{room.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {room.current_players}/{room.max_players} jogadores
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Badge variant={room.status === 'playing' ? 'default' : 'secondary'}>
            {room.status === 'waiting' ? 'Aguardando' : 
             room.status === 'playing' ? 'Em andamento' : 'Finalizado'}
          </Badge>
        </div>
      </div>

      {/* Game Status */}
      {room?.status === 'waiting' && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Timer className="h-5 w-5" />
              <span className="font-medium">
                Aguardando mais jogadores... Mínimo: 2 jogadores
              </span>
            </div>
            <Progress 
              value={(room.current_players / 2) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>
      )}

      {room?.status === 'playing' && timeUntilNext > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <Play className="h-5 w-5" />
                <span className="font-medium">Próximo número em:</span>
              </div>
              <Badge variant="outline" className="text-lg font-mono">
                {formatTime(timeUntilNext)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
        {/* Bingo Card */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-yellow-500/20 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                                  <CardTitle className="text-xl lg:text-2xl font-extrabold tracking-wide">Sua Cartela</CardTitle>
                  <div className="flex gap-2">
                    {card.has_quadra && <Badge variant="outline" className="text-yellow-600">Quadra</Badge>}
                    {card.has_quina && <Badge variant="outline" className="text-orange-600">Quina</Badge>}
                    {card.has_bingo && <Badge className="bg-green-600 text-white">Bingo!</Badge>}
                  </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* BINGO Header */}
                <div className="grid grid-cols-5 gap-1.5 lg:gap-2 mb-3 lg:mb-4">
                  {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                    <div
                      key={letter}
                      className="h-10 lg:h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-xl font-extrabold text-lg lg:text-xl shadow-inner"
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-5 gap-1.5 lg:gap-2">
                  {card.numbers.map((number, index) => {
                    const isMarked = card.marked_positions.includes(index);
                    const isFree = number === 0;
                    const wasCalled = room.called_numbers.includes(number);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => markNumber(index)}
                        disabled={isFree || isMarked || room.status !== 'playing'}
                        className={cn(
                          "h-12 lg:h-14 flex items-center justify-center rounded-xl font-extrabold text-lg lg:text-2xl transition-all",
                                                      isFree 
                              ? "bg-muted text-muted-foreground cursor-default"
                              : isMarked
                              ? "bg-green-500 text-white"
                              : wasCalled
                              ? "bg-yellow-200 text-yellow-800 hover:bg-green-500 hover:text-white"
                            : "bg-card hover:bg-accent",
                          !isFree && !isMarked && room.status === 'playing' && "cursor-pointer"
                        )}
                      >
                        {isFree ? 'FREE' : <span className="drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">{number}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Number */}
          {room.current_number && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">Número atual</div>
                  <div className="text-6xl font-bold text-primary mb-2">
                    {getColumnLetter(room.called_numbers.length - 1)}-{room.current_number}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {room.called_numbers.length} números chamados
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4 lg:sticky lg:top-4 max-h-[calc(100vh-120px)] overflow-auto">
          {/* Winners */}
          {winners.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Vencedores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {winners.map((winner, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="font-medium">{winner.username}</span>
                    <span className="text-muted-foreground">
                      {winner.prize_type} - R$ {winner.prize_amount}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Prizes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Prêmios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Quadra:</span>
                <span className="font-semibold">R$ {room.prizes.quadra}</span>
              </div>
              <div className="flex justify-between">
                <span>Quina:</span>
                <span className="font-semibold">R$ {room.prizes.quina}</span>
              </div>
              <div className="flex justify-between">
                <span>Bingo:</span>
                <span className="font-semibold">R$ {room.prizes.bingo}</span>
              </div>
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="flex flex-col lg:max-h-[calc(100vh-220px)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 p-4 min-h-[320px]">
              <div className="flex-1 overflow-auto space-y-2 mb-2">
                {messages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <span className="font-semibold text-primary">
                      {message.profiles.username}:
                    </span>{' '}
                    <span>{message.message}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  maxLength={200}
                />
                <Button size="sm" onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BingoRoom;