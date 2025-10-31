-- Script para RECRIAR a tabela event_participants do zero
-- ⚠️ ATENÇÃO: Este script irá DELETAR todos os dados existentes!

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS "Todos podem ver participantes" ON event_participants;
DROP POLICY IF EXISTS "Usuários podem se inscrever" ON event_participants;
DROP POLICY IF EXISTS "Usuários podem cancelar inscrição" ON event_participants;
DROP POLICY IF EXISTS "Criadores podem gerenciar participantes" ON event_participants;

-- 2. Remover trigger e função
DROP TRIGGER IF EXISTS trigger_update_event_participants_updated_at ON event_participants;
DROP FUNCTION IF EXISTS update_event_participants_updated_at();

-- 3. Deletar tabela (se existir)
DROP TABLE IF EXISTS event_participants CASCADE;

-- 4. Criar tabela novamente (estrutura simplificada)
CREATE TABLE event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('confirmado', 'cancelado', 'pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que um usuário não se inscreva duas vezes no mesmo evento
  UNIQUE(event_id, user_id)
);

-- 5. Criar índices
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

-- 6. Criar trigger para atualizar updated_at
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

-- 7. Habilitar RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas de acesso
CREATE POLICY "Todos podem ver participantes"
  ON event_participants FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem se inscrever"
  ON event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem cancelar inscrição"
  ON event_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Criadores podem gerenciar participantes"
  ON event_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_participants.event_id 
      AND events.criador_id = auth.uid()
    )
  );

-- 9. Adicionar comentários
COMMENT ON TABLE event_participants IS 'Tabela de participantes inscritos em eventos';
COMMENT ON COLUMN event_participants.status IS 'Status da inscrição: confirmado, cancelado, pendente';
COMMENT ON COLUMN event_participants.event_id IS 'ID do evento (relacionamento com events)';
COMMENT ON COLUMN event_participants.user_id IS 'ID do usuário (relacionamento com auth.users)';

-- ✅ Tabela recriada com sucesso!
-- Estrutura simplificada: nome, email e telefone dos participantes 
-- são obtidos através de JOIN com a tabela profiles usando user_id
