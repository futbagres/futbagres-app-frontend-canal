-- Criar tabela de notificações
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('payment_pending', 'payment_approved', 'payment_rejected', 'event_updated', 'event_cancelled', 'participant_joined')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Usuários podem ver apenas suas próprias notificações
CREATE POLICY "Usuários podem ver próprias notificações"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Sistema pode criar notificações para qualquer usuário
CREATE POLICY "Sistema pode criar notificações"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Usuários podem atualizar (marcar como lida) próprias notificações
CREATE POLICY "Usuários podem atualizar próprias notificações"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar próprias notificações
CREATE POLICY "Usuários podem deletar próprias notificações"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE notifications IS 'Tabela de notificações do sistema';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificação: payment_pending, payment_approved, payment_rejected, event_updated, event_cancelled, participant_joined';
COMMENT ON COLUMN notifications.data IS 'Dados adicionais em formato JSON (event_id, participant_id, etc)';
COMMENT ON COLUMN notifications.read IS 'Se a notificação foi lida pelo usuário';

-- ✅ Após executar, a tabela de notificações estará pronta!
-- Os tipos de notificação suportados são:
-- - payment_pending: Pagamento pendente de aprovação
-- - payment_approved: Pagamento aprovado pelo admin
-- - payment_rejected: Pagamento rejeitado pelo admin
-- - event_updated: Evento foi atualizado
-- - event_cancelled: Evento foi cancelado
-- - participant_joined: Novo participante no evento
