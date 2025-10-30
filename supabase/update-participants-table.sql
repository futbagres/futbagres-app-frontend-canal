-- ==================================================
-- ATUALIZAÇÃO DA TABELA event_participants
-- Adicionar campos payment_status e updated_at
-- ==================================================

-- Adicionar coluna payment_status se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_participants' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.event_participants 
    ADD COLUMN payment_status TEXT DEFAULT 'pendente' 
    CHECK (payment_status IN ('pago', 'pendente', 'isento'));
  END IF;
END $$;

-- Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_participants' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.event_participants 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;
  END IF;
END $$;

-- Atualizar constraint do status para incluir 'talvez'
DO $$
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE public.event_participants DROP CONSTRAINT IF EXISTS event_participants_status_check;
  
  -- Adicionar nova constraint
  ALTER TABLE public.event_participants 
  ADD CONSTRAINT event_participants_status_check 
  CHECK (status IN ('confirmado', 'talvez', 'cancelado'));
END $$;

-- Criar trigger para updated_at em event_participants
DROP TRIGGER IF EXISTS on_participant_updated ON public.event_participants;
CREATE TRIGGER on_participant_updated
  BEFORE UPDATE ON public.event_participants
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();

-- Atualizar registros existentes para ter o novo status padrão
UPDATE public.event_participants 
SET payment_status = 'pendente' 
WHERE payment_status IS NULL;

UPDATE public.event_participants 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- ==================================================
-- ATUALIZAÇÃO CONCLUÍDA!
-- ==================================================

SELECT 'Tabela event_participants atualizada com sucesso!' as message;
