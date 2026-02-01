-- ==================================================
-- MIGRATION: Alterar recorrencia de semanal para mensal
-- Adicionar campos data_inicio e data_fim para eventos mensais
-- ==================================================

-- Passo 1: Alterar constraint de recorrencia para aceitar 'mensal'
ALTER TABLE events
DROP CONSTRAINT IF EXISTS events_recorrencia_check;

ALTER TABLE events
ADD CONSTRAINT events_recorrencia_check
CHECK (recorrencia IN ('unico', 'mensal'));

-- Passo 2: Adicionar colunas data_inicio e data_fim
ALTER TABLE events
ADD COLUMN IF NOT EXISTS data_inicio DATE,
ADD COLUMN IF NOT EXISTS data_fim DATE;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN events.data_inicio IS 'Data de início para eventos mensais (formato YYYY-MM-DD). NULL para eventos únicos.';
COMMENT ON COLUMN events.data_fim IS 'Data de fim para eventos mensais (formato YYYY-MM-DD). NULL para eventos únicos.';

-- Passo 3: Atualizar eventos semanais existentes para mensais
-- Mantém o dia_semana por enquanto para compatibilidade
UPDATE events
SET recorrencia = 'mensal'
WHERE recorrencia = 'semanal';

-- Passo 4: Remover constraint antiga se existir
ALTER TABLE events
DROP CONSTRAINT IF EXISTS check_event_date_or_weekday;

-- Passo 5: Adicionar constraint atualizada
ALTER TABLE events
ADD CONSTRAINT check_event_date_or_monthly_dates
CHECK (
  (recorrencia = 'unico' AND data_evento IS NOT NULL) OR
  (recorrencia = 'mensal' AND data_inicio IS NOT NULL AND data_fim IS NOT NULL)
);