import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  Play, 
  Plus,
  Settings,
  TrendingUp,
  Activity,
  Pause,
  RotateCcw,
  Zap
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Stats {
  totalUsers: number;
  totalDeposits: number;
  activeRooms: number;
  totalRevenue: number;
}

interface RoomFormData {
  name: string;
  card_price: number;
  max_players: number;
  quadra_prize: number;
  quina_prize: number;
  bingo_prize: number;
}

interface ActiveRoom {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  current_players: number;
  max_players: number;
  called_numbers: number[];
  current_number?: number;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDeposits: 0,
    activeRooms: 0,
    totalRevenue: 0,
  });
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomForm, setRoomForm] = useState<RoomFormData>({
    name: '',
    card_price: 10,
    max_players: 50,
    quadra_prize: 100,
    quina_prize: 500,
    bingo_prize: 1000,
  });

  // Check if user is admin (replace with proper role checking)
  const isAdmin = user?.email?.includes('admin');

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchActiveRooms();
      
      // Set up real-time subscription for room updates
      const channel = supabase
        .channel('admin_rooms')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bingo_rooms',
          },
          () => {
            fetchActiveRooms();
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total deposits
      const { data: depositsData } = await supabase
        .from('deposits')
        .select('total_amount')
        .eq('status', 'completed');

      // Get active rooms
      const { count: activeRoomsCount } = await supabase
        .from('bingo_rooms')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting', 'playing']);

      const totalDeposits = depositsData?.reduce((sum, deposit) => sum + deposit.total_amount, 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalDeposits: depositsData?.length || 0,
        activeRooms: activeRoomsCount || 0,
        totalRevenue: totalDeposits,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar estatísticas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('bingo_rooms')
        .select('*')
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveRooms(data || []);
    } catch (error: any) {
      console.error('Error fetching active rooms:', error);
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { error } = await supabase
        .from('bingo_rooms')
        .insert({
          name: roomForm.name,
          card_price: roomForm.card_price,
          max_players: roomForm.max_players,
          prizes: {
            quadra: roomForm.quadra_prize,
            quina: roomForm.quina_prize,
            bingo: roomForm.bingo_prize,
          },
          status: 'waiting',
          current_players: 0,
          called_numbers: [],
        });

      if (error) throw error;

      toast({
        title: "Sala criada com sucesso",
        description: `A sala "${roomForm.name}" foi criada e está aguardando jogadores.`,
      });

      setShowCreateRoom(false);
      setRoomForm({
        name: '',
        card_price: 10,
        max_players: 50,
        quadra_prize: 100,
        quina_prize: 500,
        bingo_prize: 1000,
      });
      fetchStats();
      fetchActiveRooms();
    } catch (error: any) {
      toast({
        title: "Erro ao criar sala",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const forceStartGame = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('bingo_rooms')
        .update({
          status: 'playing',
          start_time: new Date().toISOString(),
          next_number_at: new Date(Date.now() + 5000).toISOString(),
        })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Jogo iniciado",
        description: "O jogo foi iniciado manualmente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar jogo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const pauseGame = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('bingo_rooms')
        .update({
          next_number_at: null,
        })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Jogo pausado",
        description: "O sorteio foi pausado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao pausar jogo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const endGame = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('bingo_rooms')
        .update({
          status: 'finished',
          end_time: new Date().toISOString(),
          next_number_at: null,
        })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Jogo finalizado",
        description: "O jogo foi finalizado manualmente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar jogo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const drawNumber = async (roomId: string) => {
    try {
      const room = activeRooms.find(r => r.id === roomId);
      if (!room) return;

      const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
        .filter(num => !room.called_numbers.includes(num));

      if (availableNumbers.length === 0) {
        toast({
          title: "Todos os números foram sorteados",
          description: "Não há mais números disponíveis.",
          variant: "destructive",
        });
        return;
      }

      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const drawnNumber = availableNumbers[randomIndex];
      const newCalledNumbers = [...room.called_numbers, drawnNumber];

      const { error } = await supabase
        .from('bingo_rooms')
        .update({
          current_number: drawnNumber,
          called_numbers: newCalledNumbers,
          next_number_at: new Date(Date.now() + 10000).toISOString(),
        })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Número sorteado",
        description: `Número ${drawnNumber} foi sorteado!`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao sortear número",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Gerencie a plataforma de bingo
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Settings className="mr-2 h-4 w-4" />
          Administrador
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depósitos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeposits}</div>
            <p className="text-xs text-muted-foreground">
              Total de transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salas Ativas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRooms}</div>
            <p className="text-xs text-muted-foreground">
              Em andamento/aguardando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Valor em depósitos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Rooms Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Controle de Salas Ativas
          </CardTitle>
          <CardDescription>
            Gerencie jogos em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRooms.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma sala ativa no momento
            </p>
          ) : (
            <div className="space-y-4">
              {activeRooms.map((room) => (
                <div key={room.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{room.current_players}/{room.max_players} jogadores</span>
                        <Badge variant={room.status === 'playing' ? 'default' : 'secondary'}>
                          {room.status === 'waiting' ? 'Aguardando' : 'Em andamento'}
                        </Badge>
                        {room.called_numbers.length > 0 && (
                          <span>{room.called_numbers.length} números sorteados</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {room.status === 'waiting' && (
                        <Button
                          size="sm"
                          onClick={() => forceStartGame(room.id)}
                          className="text-xs"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Iniciar
                        </Button>
                      )}
                      {room.status === 'playing' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => drawNumber(room.id)}
                            className="text-xs"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Sortear
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pauseGame(room.id)}
                            className="text-xs"
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Pausar
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => endGame(room.id)}
                        className="text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Finalizar
                      </Button>
                    </div>
                  </div>
                  
                  {room.current_number && (
                    <div className="bg-primary/10 rounded p-2 text-center">
                      <span className="text-sm text-muted-foreground">Último número: </span>
                      <span className="font-bold text-lg text-primary">{room.current_number}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Room Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Gerenciar Salas
              </CardTitle>
              <CardDescription>
                Crie e gerencie salas de bingo
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateRoom(!showCreateRoom)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Nova Sala
            </Button>
          </div>
        </CardHeader>
        
        {showCreateRoom && (
          <CardContent>
            <form onSubmit={createRoom} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Nome da Sala</Label>
                  <Input
                    id="room-name"
                    value={roomForm.name}
                    onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                    placeholder="Ex: Sala VIP 1"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="card-price">Preço da Cartela (R$)</Label>
                  <Input
                    id="card-price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={roomForm.card_price}
                    onChange={(e) => setRoomForm({ ...roomForm, card_price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-players">Máximo de Jogadores</Label>
                  <Input
                    id="max-players"
                    type="number"
                    min="2"
                    max="200"
                    value={roomForm.max_players}
                    onChange={(e) => setRoomForm({ ...roomForm, max_players: parseInt(e.target.value) })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quadra-prize">Prêmio Quadra (R$)</Label>
                  <Input
                    id="quadra-prize"
                    type="number"
                    min="0"
                    step="0.01"
                    value={roomForm.quadra_prize}
                    onChange={(e) => setRoomForm({ ...roomForm, quadra_prize: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quina-prize">Prêmio Quina (R$)</Label>
                  <Input
                    id="quina-prize"
                    type="number"
                    min="0"
                    step="0.01"
                    value={roomForm.quina_prize}
                    onChange={(e) => setRoomForm({ ...roomForm, quina_prize: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bingo-prize">Prêmio Bingo (R$)</Label>
                  <Input
                    id="bingo-prize"
                    type="number"
                    min="0"
                    step="0.01"
                    value={roomForm.bingo_prize}
                    onChange={(e) => setRoomForm({ ...roomForm, bingo_prize: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar Sala'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateRoom(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AdminPanel;