-- Criar tabela de participantes de eventos
-- Versão simplificada: nome, email e telefone vêm da tabela profiles
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'cancelado', 'pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que um usuário não se inscreva duas vezes no mesmo evento
  UNIQUE(event_id, user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_event_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participants_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Usuários podem ver participantes de eventos
CREATE POLICY "Todos podem ver participantes"
  ON event_participants FOR SELECT
  USING (true);

-- Usuários podem se inscrever em eventos
CREATE POLICY "Usuários podem se inscrever"
  ON event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem cancelar sua própria inscrição
CREATE POLICY "Usuários podem cancelar inscrição"
  ON event_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Criadores de eventos podem gerenciar participantes
CREATE POLICY "Criadores podem gerenciar participantes"
  ON event_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_participants.event_id 
      AND events.criador_id = auth.uid()
    )
  );

COMMENT ON TABLE event_participants IS 'Tabela de participantes inscritos em eventos';
COMMENT ON COLUMN event_participants.status IS 'Status da inscrição: confirmado, cancelado, pendente';
