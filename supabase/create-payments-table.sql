-- Criar tabela de pagamentos

CREATE TABLE IF NOT EXISTS event_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações do pagamento
  valor DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'confirmado', 'cancelado', 'reembolsado')),
  metodo_pagamento VARCHAR(50) CHECK (metodo_pagamento IN ('pix', 'cartao', 'dinheiro', 'transferencia')),
  
  -- Datas de controle
  data_pagamento TIMESTAMP WITH TIME ZONE, -- Quando o pagamento foi efetivado
  data_validade DATE, -- Até quando este pagamento é válido (para eventos sazonais)
  data_vencimento DATE, -- Data limite para pagamento (opcional)
  
  -- Referência externa (ID de transação do gateway de pagamento, se houver)
  referencia_externa VARCHAR(255),
  
  -- Observações
  observacoes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_payments_participant ON event_payments(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_event ON event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_user ON event_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_status ON event_payments(status);
CREATE INDEX IF NOT EXISTS idx_event_payments_validade ON event_payments(data_validade);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_event_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_payments_updated_at
  BEFORE UPDATE ON event_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_event_payments_updated_at();

-- Trigger para atualizar status do participante quando pagamento for confirmado
CREATE OR REPLACE FUNCTION update_participant_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se pagamento confirmado, atualizar participante para 'confirmado'
  IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
    UPDATE event_participants 
    SET status = 'confirmado'
    WHERE id = NEW.participant_id;
  END IF;
  
  -- Se pagamento cancelado/reembolsado, voltar para 'pendente'
  IF (NEW.status = 'cancelado' OR NEW.status = 'reembolsado') AND OLD.status = 'confirmado' THEN
    UPDATE event_participants 
    SET status = 'pendente'
    WHERE id = NEW.participant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_participant_on_payment
  AFTER UPDATE ON event_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_status_on_payment();

-- Habilitar RLS
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Usuários podem ver seus próprios pagamentos
CREATE POLICY "Usuários podem ver próprios pagamentos"
  ON event_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem criar pagamentos para si mesmos
CREATE POLICY "Usuários podem criar pagamentos"
  ON event_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Criadores de eventos podem ver todos os pagamentos do evento
CREATE POLICY "Criadores podem ver pagamentos do evento"
  ON event_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_payments.event_id 
      AND events.criador_id = auth.uid()
    )
  );

-- Criadores podem atualizar status de pagamentos (confirmar pagamento manual)
CREATE POLICY "Criadores podem atualizar pagamentos"
  ON event_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_payments.event_id 
      AND events.criador_id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE event_payments IS 'Tabela de pagamentos dos participantes de eventos';
COMMENT ON COLUMN event_payments.status IS 'Status: pendente, processando, confirmado, cancelado, reembolsado';
COMMENT ON COLUMN event_payments.data_validade IS 'Data até quando o pagamento é válido (para eventos sazonais recorrentes)';
COMMENT ON COLUMN event_payments.metodo_pagamento IS 'Método usado: pix, cartao, dinheiro, transferencia';

-- ✅ Tabela de pagamentos criada com sucesso!
-- Features:
-- - Rastreamento completo de pagamentos
-- - Trigger automático para atualizar status do participante
-- - Suporte a pagamentos sazonais com data de validade
-- - RLS configurado para segurança
