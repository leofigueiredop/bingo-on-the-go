import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Users, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Wallet,
  Plus
} from 'lucide-react';

interface BingoRoom {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  current_players: number;
  max_players: number;
  card_price: number;
  prizes: {
    bingo: number;
    quina: number;
    quadra: number;
  };
  start_time?: string;
}

interface UserProfile {
  balance: number;
  total_deposited: number;
  username: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<BingoRoom[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('balance, total_deposited, username')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch bingo rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('bingo_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (room: BingoRoom) => {
    if (!profile) return;
    
    if (profile.balance < room.card_price) {
      toast({
        title: "Saldo insuficiente",
        description: "Você precisa fazer um depósito para jogar.",
        variant: "destructive",
      });
      navigate('/deposits');
      return;
    }

    navigate(`/bingo/${room.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-warning text-warning-foreground';
      case 'playing':
        return 'bg-success text-success-foreground';
      case 'finished':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Aguardando';
      case 'playing':
        return 'Em andamento';
      case 'finished':
        return 'Finalizado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
          <h1 className="text-3xl font-bold">Bem-vindo, {profile?.username}!</h1>
          <p className="text-muted-foreground">Escolha uma sala e comece a jogar</p>
        </div>
        <Button onClick={() => navigate('/deposits')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Depositar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {profile?.balance?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depositado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {profile?.total_deposited?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salas Disponíveis</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.filter(r => r.status === 'waiting').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bingo Rooms */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Salas de Bingo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <Badge className={getStatusColor(room.status)}>
                    {getStatusText(room.status)}
                  </Badge>
                </div>
                <CardDescription>
                  Cartela: R$ {room.card_price.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {room.current_players}/{room.max_players}
                  </div>
                  {room.start_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(room.start_time).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Prêmios:</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium">Quadra</div>
                      <div className="text-muted-foreground">R$ {room.prizes.quadra}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Quina</div>
                      <div className="text-muted-foreground">R$ {room.prizes.quina}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Bingo</div>
                      <div className="text-muted-foreground">R$ {room.prizes.bingo}</div>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => joinRoom(room)}
                  disabled={room.status === 'finished' || room.current_players >= room.max_players}
                >
                  {room.status === 'waiting' ? 'Entrar na Sala' : 
                   room.status === 'playing' ? 'Assistir' : 'Finalizado'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {rooms.length === 0 && (
          <Card className="p-12 text-center">
            <CardContent>
              <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma sala disponível</h3>
              <p className="text-muted-foreground">
                Novas salas serão criadas em breve. Volte mais tarde!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;