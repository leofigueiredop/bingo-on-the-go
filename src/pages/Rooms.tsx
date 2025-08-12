import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Play, Clock } from 'lucide-react';

interface BingoRoom {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  current_players: number;
  max_players: number;
  card_price: number;
  prizes: { bingo: number; quina: number; quadra: number };
  start_time?: string;
}

export default function Rooms() {
  const [rooms, setRooms] = useState<BingoRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    const channel = supabase
      .channel('rooms_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_rooms' }, fetchRooms)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  async function fetchRooms() {
    const { data } = await supabase.from('bingo_rooms').select('*').order('created_at', { ascending: false });
    setRooms(data || []);
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-[720px] mx-auto">
      <h1 className="text-2xl font-extrabold mb-4">Salas</h1>
      <div className="grid gap-3">
        {(loading ? Array.from({ length: 3 }) : rooms).map((room: any, idx: number) => (
          <Card key={room?.id || idx} className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">{room?.name || '...'}</CardTitle>
                <Badge>
                  {room?.status === 'waiting' ? 'Aguardando' : room?.status === 'playing' ? 'Em andamento' : 'Finalizado'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1"><Users className="h-4 w-4" /> {room?.current_players}/{room?.max_players}</div>
                <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {room?.start_time ? new Date(room.start_time).toLocaleTimeString() : '--:--'}</div>
              </div>
              <Button size="sm" onClick={() => navigate(`/bingo/${room.id}`)}>
                <Play className="h-4 w-4 mr-1" /> Entrar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


