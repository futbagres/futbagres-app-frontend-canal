-- Criar tabela de avaliações de jogadores (BagreScore)

CREATE TABLE IF NOT EXISTS player_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliado_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notas de habilidades (0.5 a 5.0 com incrementos de 0.5)
  defesa DECIMAL(2,1) NOT NULL CHECK (defesa >= 0.5 AND defesa <= 5.0 AND MOD(defesa * 10, 5) = 0),
  velocidade DECIMAL(2,1) NOT NULL CHECK (velocidade >= 0.5 AND velocidade <= 5.0 AND MOD(velocidade * 10, 5) = 0),
  passe DECIMAL(2,1) NOT NULL CHECK (passe >= 0.5 AND passe <= 5.0 AND MOD(passe * 10, 5) = 0),
  chute DECIMAL(2,1) NOT NULL CHECK (chute >= 0.5 AND chute <= 5.0 AND MOD(chute * 10, 5) = 0),
  drible DECIMAL(2,1) NOT NULL CHECK (drible >= 0.5 AND drible <= 5.0 AND MOD(drible * 10, 5) = 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: um avaliador só pode avaliar um jogador uma vez por evento
  CONSTRAINT unique_evaluation_per_event UNIQUE (event_id, avaliador_id, avaliado_id),
  
  -- Constraint: não pode se autoavaliar
  CONSTRAINT no_self_evaluation CHECK (avaliador_id != avaliado_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_player_evaluations_event ON player_evaluations(event_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_avaliador ON player_evaluations(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_avaliado ON player_evaluations(avaliado_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_player_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_evaluations_updated_at
  BEFORE UPDATE ON player_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_player_evaluations_updated_at();

-- Habilitar RLS
ALTER TABLE player_evaluations ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso

-- Todos podem ver avaliações (públicas)
CREATE POLICY "Avaliações são públicas"
  ON player_evaluations FOR SELECT
  USING (true);

-- Apenas participantes confirmados do evento podem criar avaliações
CREATE POLICY "Participantes confirmados podem avaliar"
  ON player_evaluations FOR INSERT
  WITH CHECK (
    auth.uid() = avaliador_id
    AND EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = player_evaluations.event_id
      AND user_id = auth.uid()
      AND status = 'confirmado'
    )
    AND EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = player_evaluations.event_id
      AND user_id = player_evaluations.avaliado_id
      AND status = 'confirmado'
    )
  );

-- Avaliador pode atualizar sua própria avaliação
CREATE POLICY "Avaliador pode atualizar própria avaliação"
  ON player_evaluations FOR UPDATE
  USING (auth.uid() = avaliador_id);

-- Avaliador pode deletar sua própria avaliação
CREATE POLICY "Avaliador pode deletar própria avaliação"
  ON player_evaluations FOR DELETE
  USING (auth.uid() = avaliador_id);

-- Comentários
COMMENT ON TABLE player_evaluations IS 'Avaliações de jogadores após eventos (BagreScore)';
COMMENT ON COLUMN player_evaluations.defesa IS 'Nota de defesa (0.5 a 5.0)';
COMMENT ON COLUMN player_evaluations.velocidade IS 'Nota de velocidade (0.5 a 5.0)';
COMMENT ON COLUMN player_evaluations.passe IS 'Nota de passe (0.5 a 5.0)';
COMMENT ON COLUMN player_evaluations.chute IS 'Nota de chute (0.5 a 5.0)';
COMMENT ON COLUMN player_evaluations.drible IS 'Nota de drible (0.5 a 5.0)';

-- ✅ Tabela de avaliações criada com sucesso!
-- Features:
-- - Avaliações de 5 habilidades com notas de 0.5 a 5.0
-- - Constraint para evitar avaliações duplicadas no mesmo evento
-- - Constraint para evitar autoavaliação
-- - RLS configurado: participantes confirmados podem avaliar
-- - Avaliações são públicas (todos podem ver o BagreScore)
