-- Adicionar sistema de pagamento e presença

-- 1. Adicionar chave PIX no perfil do admin
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS chave_pix VARCHAR(255);

COMMENT ON COLUMN profiles.chave_pix IS 'Chave PIX do usuário para receber pagamentos (CPF, email, telefone, ou chave aleatória)';

-- 2. Adicionar campo de comprovante na tabela de pagamentos
ALTER TABLE event_payments 
ADD COLUMN IF NOT EXISTS comprovante_url TEXT;

COMMENT ON COLUMN event_payments.comprovante_url IS 'URL do comprovante de pagamento enviado pelo usuário (armazenado no Supabase Storage)';

-- 3. Adicionar status de presença na tabela de participantes
ALTER TABLE event_participants 
ADD COLUMN IF NOT EXISTS presence_status VARCHAR(20) DEFAULT 'talvez' 
CHECK (presence_status IN ('confirmado', 'talvez', 'nao_vou'));

COMMENT ON COLUMN event_participants.presence_status IS 'Status de confirmação de presença no evento (só pode mudar se pagamento estiver em dia)';

-- 4. Criar bucket de storage para comprovantes (executar separadamente no Supabase Dashboard)
-- Storage > New Bucket > Name: payment-receipts > Public: false

-- ✅ Alterações aplicadas com sucesso!
-- 
-- Próximos passos:
-- 1. No Supabase Dashboard, vá em Storage
-- 2. Crie um novo bucket chamado "payment-receipts"
-- 3. Defina como privado (não público)
-- 4. Configure as políticas RLS no Storage:
--    - Usuários podem fazer upload dos próprios comprovantes
--    - Criadores de eventos podem ver comprovantes dos participantes
