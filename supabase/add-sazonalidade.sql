-- Adicionar campos de sazonalidade e pagamento aos eventos

-- 1. Adicionar coluna de sazonalidade (em meses)
-- NULL = evento único sem sazonalidade
-- 1 = pagamento mensal
-- 3 = pagamento trimestral
-- 6 = pagamento semestral
-- 12 = pagamento anual
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS sazonalidade_meses INTEGER CHECK (sazonalidade_meses IN (1, 3, 6, 12));

-- 2. Adicionar data limite para pagamento (apenas para eventos com sazonalidade)
-- Esta data será recalculada automaticamente a cada período
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS data_limite_pagamento DATE;

-- 3. Adicionar flag se evento requer pagamento
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS requer_pagamento BOOLEAN DEFAULT false;

-- 4. Comentários explicativos
COMMENT ON COLUMN events.sazonalidade_meses IS 'Período de validade do pagamento em meses (1, 3, 6, 12). NULL para eventos únicos';
COMMENT ON COLUMN events.data_limite_pagamento IS 'Data limite para pagamento da próxima parcela/período';
COMMENT ON COLUMN events.requer_pagamento IS 'Indica se o evento requer pagamento para confirmação';

-- 5. Criar índice para consultas rápidas de eventos com pagamento vencendo
CREATE INDEX IF NOT EXISTS idx_events_pagamento_vencendo 
ON events(data_limite_pagamento) 
WHERE requer_pagamento = true AND data_limite_pagamento IS NOT NULL;

-- ✅ Campos adicionados com sucesso!
-- Agora eventos podem ter:
-- - Pagamento único (valor_por_pessoa > 0, sazonalidade_meses = NULL)
-- - Pagamento recorrente mensal (sazonalidade_meses = 1)
-- - Pagamento recorrente trimestral (sazonalidade_meses = 3)
-- - Pagamento recorrente semestral (sazonalidade_meses = 6)
-- - Pagamento recorrente anual (sazonalidade_meses = 12)
