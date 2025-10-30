-- Passo 1: Adicionar coluna de data para eventos únicos
ALTER TABLE events
ADD COLUMN IF NOT EXISTS data_evento DATE;

-- Adicionar comentário na coluna
COMMENT ON COLUMN events.data_evento IS 'Data específica para eventos únicos (formato YYYY-MM-DD). NULL para eventos recorrentes.';

-- Passo 2: Atualizar eventos únicos existentes sem data
-- Define data para daqui a 7 dias (ajuste conforme necessário)
UPDATE events
SET data_evento = CURRENT_DATE + INTERVAL '7 days'
WHERE recorrencia = 'unico' 
  AND data_evento IS NULL;

-- Passo 3: Atualizar eventos semanais sem dia_semana
-- Define como sábado (6) por padrão (ajuste conforme necessário)
UPDATE events
SET dia_semana = 6
WHERE recorrencia = 'semanal' 
  AND dia_semana IS NULL;

-- Passo 4: Remover constraint antiga se existir
ALTER TABLE events
DROP CONSTRAINT IF EXISTS check_event_date_or_weekday;

-- Passo 5: Adicionar constraint atualizada
ALTER TABLE events
ADD CONSTRAINT check_event_date_or_weekday 
CHECK (
  (recorrencia = 'unico' AND data_evento IS NOT NULL) OR
  (recorrencia = 'semanal' AND dia_semana IS NOT NULL)
);
