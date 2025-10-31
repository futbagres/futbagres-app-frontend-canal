-- Atualizar constraint da tabela notifications para incluir 'teams_generated'
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar constraint nova com 'teams_generated'
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'payment_pending', 
  'payment_approved', 
  'payment_rejected', 
  'event_updated', 
  'event_cancelled', 
  'participant_joined',
  'teams_generated'
));

-- ✅ Constraint atualizada!
