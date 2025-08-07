import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  ArrowLeft, 
  Users, 
  Crown,
  MessageCircle,
  Volume2,
  VolumeX
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
  
  const [room, setRoom] = useState<BingoRoom | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!roomId || !user) return;
    
    fetchRoomData();
    setupRealtimeSubscriptions();
    
    return () => {
      // Cleanup subscriptions
    };
  }, [roomId, user]);

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
      setRoom(roomData);

      // Fetch or create user's card
      let { data: cardData, error: cardError } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (cardError && cardError.code !== 'PGRST116') throw cardError;

      if (!cardData) {
        // Create new card
        const newCard = generateBingoCard();
        const { data: createdCard, error: createError } = await supabase
          .from('bingo_cards')
          .insert({
            room_id: roomId,
            user_id: user.id,
            numbers: newCard,
            marked_positions: [],
          })
          .select()
          .single();

        if (createError) throw createError;
        cardData = createdCard;

        // Deduct card price from user balance
        const { error: balanceError } = await supabase.rpc('deduct_balance', {
          user_id: user.id,
          amount: roomData.card_price
        });

        if (balanceError) {
          toast({
            title: "Erro ao processar pagamento",
            description: balanceError.message,
            variant: "destructive",
          });
          navigate('/');
          return;
        }
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

    // Subscribe to room updates
    const roomChannel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bingo_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(payload.new as BingoRoom);
          if (payload.new.current_number && soundEnabled) {
            // Play sound for new number
          }
        }
      )
      .subscribe();

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bingo Card */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sua Cartela</CardTitle>
                <div className="flex gap-2">
                  {card.has_quadra && <Badge variant="outline">Quadra</Badge>}
                  {card.has_quina && <Badge variant="outline">Quina</Badge>}
                  {card.has_bingo && <Badge className="bg-bingo-winner text-bingo-winner-foreground">Bingo!</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* BINGO Header */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                    <div
                      key={letter}
                      className="h-12 flex items-center justify-center bg-primary text-primary-foreground rounded font-bold text-xl"
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-5 gap-2">
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
                          "h-12 flex items-center justify-center rounded font-semibold transition-all",
                          isFree 
                            ? "bg-muted text-muted-foreground cursor-default"
                            : isMarked
                            ? "bg-bingo-marked text-bingo-marked-foreground"
                            : wasCalled
                            ? "bg-bingo-called text-bingo-called-foreground hover:bg-bingo-marked hover:text-bingo-marked-foreground"
                            : "bg-card hover:bg-accent",
                          !isFree && !isMarked && room.status === 'playing' && "cursor-pointer"
                        )}
                      >
                        {isFree ? 'FREE' : number}
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

        {/* Chat and Info */}
        <div className="space-y-4">
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
          <Card className="h-96 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 p-4">
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