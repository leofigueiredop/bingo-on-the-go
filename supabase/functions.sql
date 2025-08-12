-- ==============================================
-- FUNÇÕES RPC PARA PLATAFORMA DE BINGO ONLINE
-- ==============================================

-- Function to add balance to user account
-- Esta função adiciona saldo ao perfil do usuário
CREATE OR REPLACE FUNCTION add_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET balance = balance + amount,
      updated_at = NOW()
  WHERE profiles.user_id = add_balance.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct balance from user account
-- Esta função deduz saldo do perfil do usuário
CREATE OR REPLACE FUNCTION deduct_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET balance = balance - amount,
      updated_at = NOW()
  WHERE profiles.user_id = deduct_balance.user_id
    AND balance >= amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or user not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to distribute prize and update statistics
-- Esta função distribui prêmios e atualiza estatísticas
CREATE OR REPLACE FUNCTION distribute_prize(user_id UUID, amount DECIMAL, prize_type TEXT)
RETURNS VOID AS $$
BEGIN
  -- Add to balance
  UPDATE profiles 
  SET balance = balance + amount,
      updated_at = NOW()
  WHERE profiles.user_id = distribute_prize.user_id;
  
  -- Record the prize win (se existir tabela prize_wins)
  INSERT INTO prize_wins (user_id, amount, prize_type, created_at)
  VALUES (user_id, amount, prize_type, NOW())
  ON CONFLICT DO NOTHING; -- Ignora se tabela não existir
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-start game when conditions are met
-- Esta função verifica condições para início automático do jogo
CREATE OR REPLACE FUNCTION check_auto_start_conditions()
RETURNS TRIGGER AS $$
BEGIN
  -- If room reaches minimum players and is still waiting
  IF NEW.current_players >= 2 AND NEW.status = 'waiting' AND OLD.status = 'waiting' THEN
    -- Set auto start time to 30 seconds from now
    UPDATE bingo_rooms 
    SET auto_start_at = NOW() + INTERVAL '30 seconds'
    WHERE id = NEW.id AND auto_start_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-start
-- Cria trigger para início automático
DROP TRIGGER IF EXISTS auto_start_trigger ON bingo_rooms;
CREATE TRIGGER auto_start_trigger
  AFTER UPDATE ON bingo_rooms
  FOR EACH ROW
  EXECUTE FUNCTION check_auto_start_conditions();

-- Function to create prize distribution entries
-- Esta função cria entradas de distribuição de prêmios
CREATE OR REPLACE FUNCTION create_prize_entry(
  room_id UUID,
  user_id UUID,
  prize_type TEXT,
  amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO prize_distributions (room_id, user_id, prize_type, amount, created_at)
  VALUES (room_id, user_id, prize_type, amount, NOW())
  ON CONFLICT DO NOTHING; -- Ignora se tabela não existir
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update player count when joining room
-- Esta função atualiza contagem de jogadores
CREATE OR REPLACE FUNCTION join_room(room_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has a card in this room
  IF NOT EXISTS (
    SELECT 1 FROM bingo_cards 
    WHERE bingo_cards.room_id = join_room.room_id 
    AND bingo_cards.user_id = join_room.user_id
  ) THEN
    -- Increment player count
    UPDATE bingo_rooms 
    SET current_players = current_players + 1,
        updated_at = NOW()
    WHERE id = join_room.room_id
    AND status = 'waiting'
    AND current_players < max_players;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Room is full, finished, or not found';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave room (decrease player count)
-- Esta função diminui contagem de jogadores
CREATE OR REPLACE FUNCTION leave_room(room_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete user's card and decrease count
  DELETE FROM bingo_cards 
  WHERE bingo_cards.room_id = leave_room.room_id 
  AND bingo_cards.user_id = leave_room.user_id;
  
  -- Only decrease count if room is still waiting
  UPDATE bingo_rooms 
  SET current_players = GREATEST(0, current_players - 1),
      updated_at = NOW()
  WHERE id = leave_room.room_id
  AND status = 'waiting';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can afford room entry
-- Esta função verifica se usuário pode pagar entrada da sala
CREATE OR REPLACE FUNCTION can_afford_room(user_id UUID, room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_balance DECIMAL;
  room_price DECIMAL;
BEGIN
  -- Get user balance
  SELECT balance INTO user_balance
  FROM profiles
  WHERE profiles.user_id = can_afford_room.user_id;
  
  -- Get room price
  SELECT card_price INTO room_price
  FROM bingo_rooms
  WHERE id = can_afford_room.room_id;
  
  -- Return true if user can afford
  RETURN (user_balance >= room_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unique guard: um usuário só pode ter 1 cartela por sala
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_bingo_card_room_user'
  ) THEN
    CREATE UNIQUE INDEX uniq_bingo_card_room_user ON public.bingo_cards(room_id, user_id);
  END IF;
END $$;

-- Entrada transacional na sala: reserva vaga, cria cartela e debita saldo
-- Tudo-or-nothing para evitar múltiplas cobranças
CREATE OR REPLACE FUNCTION enter_room(
  p_room_id UUID,
  p_user_id UUID,
  p_numbers INTEGER[],
  p_amount NUMERIC
) RETURNS public.bingo_cards AS $$
DECLARE
  v_card public.bingo_cards;
  v_balance NUMERIC;
BEGIN
  -- Verifica saldo
  SELECT balance INTO v_balance FROM public.profiles WHERE user_id = p_user_id;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Impede duplicidade (retorna a existente sem cobrar de novo)
  SELECT * INTO v_card FROM public.bingo_cards WHERE room_id = p_room_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN v_card;
  END IF;

  -- Reserva vaga
  UPDATE public.bingo_rooms
     SET current_players = current_players + 1,
         updated_at = NOW()
   WHERE id = p_room_id AND status = 'waiting' AND current_players < max_players;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala indisponível';
  END IF;

  -- Cria cartela
  INSERT INTO public.bingo_cards(room_id, user_id, numbers, marked_positions)
  VALUES (p_room_id, p_user_id, p_numbers, ARRAY[]::integer[])
  RETURNING * INTO v_card;

  -- Debita saldo
  UPDATE public.profiles
     SET balance = balance - p_amount,
         updated_at = NOW()
   WHERE user_id = p_user_id AND balance >= p_amount;
  IF NOT FOUND THEN
    -- rollback criação e vaga
    DELETE FROM public.bingo_cards WHERE id = v_card.id;
    UPDATE public.bingo_rooms SET current_players = GREATEST(0,current_players-1), updated_at = NOW() WHERE id = p_room_id;
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  RETURN v_card;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sorteio do próximo número (único por vez com advisory lock)
CREATE OR REPLACE FUNCTION draw_next_number(
  p_room_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_lock_key BIGINT;
  v_curr INTEGER;
  v_called INTEGER[];
  v_avail INTEGER[];
  v_len INT;
  v_idx INT;
BEGIN
  -- chave para advisory lock (hash simples do UUID)
  SELECT ('x' || substr(p_room_id::text, 1, 16))::bit(64)::bigint INTO v_lock_key;
  IF NOT pg_try_advisory_lock(v_lock_key) THEN
    -- outro processo já está sorteando
    RETURN NULL;
  END IF;

  -- trava a linha da sala
  SELECT called_numbers INTO v_called
  FROM public.bingo_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_called IS NULL THEN
    v_called := ARRAY[]::integer[];
  END IF;

  -- monta array de disponíveis
  SELECT coalesce(array_agg(n), ARRAY[]::integer[])
    INTO v_avail
  FROM generate_series(1,75) AS n
  WHERE NOT (n = ANY (v_called));

  v_len := coalesce(array_length(v_avail,1), 0);
  IF v_len = 0 THEN
    -- fim de jogo
    UPDATE public.bingo_rooms
       SET status = 'finished', current_number = NULL, next_number_at = NULL
     WHERE id = p_room_id;
    PERFORM pg_advisory_unlock(v_lock_key);
    RETURN NULL;
  END IF;

  v_idx := 1 + floor(random() * v_len)::int;
  v_curr := v_avail[v_idx];

  UPDATE public.bingo_rooms
     SET current_number = v_curr,
         called_numbers = v_called || v_curr,
         next_number_at = now() + interval '10 seconds'
   WHERE id = p_room_id;

  PERFORM pg_advisory_unlock(v_lock_key);
  RETURN v_curr;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_advisory_unlock(v_lock_key);
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================
-- COMENTÁRIOS PARA IMPLEMENTAÇÃO:
-- ==============================================

/*
Para usar essas funções no seu código React:

1. add_balance / deduct_balance:
   await supabase.rpc('add_balance', { user_id: userId, amount: 100 });

2. join_room (ao entrar em sala):
   await supabase.rpc('join_room', { room_id: roomId, user_id: userId });

3. can_afford_room (antes de entrar):
   const { data } = await supabase.rpc('can_afford_room', { user_id: userId, room_id: roomId });

4. distribute_prize (quando alguém ganha):
   await supabase.rpc('distribute_prize', { user_id: userId, amount: 500, prize_type: 'bingo' });

IMPORTANTE: Execute essas funções no SQL Editor do Supabase Dashboard
*/