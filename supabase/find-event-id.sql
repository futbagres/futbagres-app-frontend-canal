-- Script auxiliar para encontrar o ID do seu evento
-- Execute este SQL primeiro para descobrir qual evento usar

-- Listar todos os eventos
SELECT 
  id,
  titulo,
  tipo_futebol,
  recorrencia,
  data_evento,
  horario_inicio,
  max_participantes,
  status,
  created_at
FROM events
ORDER BY created_at DESC
LIMIT 10;

-- Para copiar o ID de um evento específico:
-- 1. Execute a query acima
-- 2. Encontre seu evento
-- 3. Copie o valor da coluna 'id'
-- 4. Cole no arquivo insert-test-players.sql na linha:
--    target_event_id UUID := 'COLE_AQUI';
