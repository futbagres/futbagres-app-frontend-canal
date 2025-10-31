-- Tabela para armazenar times sorteados do dia do jogo
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS game_day_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_date DATE NOT NULL, -- Data específica do jogo
  team_number INT NOT NULL,
  team_name VARCHAR(50) NOT NULL, -- "Vermelho", "Azul", etc
  team_color VARCHAR(50) NOT NULL, -- Código da cor
  created_by UUID NOT NULL REFERENCES auth.users(id),
  evaluation_type VARCHAR(20) NOT NULL CHECK (evaluation_type IN ('auto', 'historic')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, event_date, team_number)
);

-- Tabela para jogadores dos times
CREATE TABLE IF NOT EXISTS game_day_team_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES game_day_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
  player_score DECIMAL(3, 2) NOT NULL, -- Score calculado no momento do sorteio
  player_order INT NOT NULL, -- Ordem do jogador no time (1, 2, 3...)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, participant_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_game_day_teams_event_date ON game_day_teams(event_id, event_date);
CREATE INDEX IF NOT EXISTS idx_game_day_team_players_team ON game_day_team_players(team_id);

-- Habilitar RLS
ALTER TABLE game_day_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_day_team_players ENABLE ROW LEVEL SECURITY;

-- Políticas game_day_teams
-- Todos podem ver times de eventos
CREATE POLICY "Todos podem ver times"
  ON game_day_teams FOR SELECT
  USING (true);

-- Apenas criador do evento pode criar times
CREATE POLICY "Criador pode criar times"
  ON game_day_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_id 
      AND events.criador_id = auth.uid()
    )
  );

-- Apenas criador pode deletar times
CREATE POLICY "Criador pode deletar times"
  ON game_day_teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_id 
      AND events.criador_id = auth.uid()
    )
  );

-- Políticas game_day_team_players
-- Todos podem ver jogadores dos times
CREATE POLICY "Todos podem ver jogadores dos times"
  ON game_day_team_players FOR SELECT
  USING (true);

-- Sistema pode inserir jogadores (via criador do evento)
CREATE POLICY "Sistema pode inserir jogadores nos times"
  ON game_day_team_players FOR INSERT
  WITH CHECK (true);

-- Sistema pode deletar jogadores
CREATE POLICY "Sistema pode deletar jogadores dos times"
  ON game_day_team_players FOR DELETE
  USING (true);

COMMENT ON TABLE game_day_teams IS 'Times sorteados para o dia do jogo';
COMMENT ON TABLE game_day_team_players IS 'Jogadores de cada time sorteado';

-- ✅ Após executar, as tabelas estarão prontas para o sorteio de times!
