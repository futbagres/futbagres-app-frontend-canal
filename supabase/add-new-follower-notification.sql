-- Atualizar tipos de notificação para incluir 'new_follower'
-- Execute este script no SQL Editor do Supabase

-- Verificar estrutura atual da tabela notifications
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications' AND table_schema = 'public';

-- Verificar constraint atual
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'notifications' AND c.contype = 'c';

-- Remover constraint CHECK existente
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar novo tipo à lista permitida recriando o constraint
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'payment_pending',
  'payment_approved',
  'payment_rejected',
  'event_updated',
  'event_cancelled',
  'participant_joined',
  'teams_generated',
  'new_follower'
));

-- Verificar se foi atualizado
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'notifications' AND c.contype = 'c';

-- Verificar notificações existentes (opcional)
SELECT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;