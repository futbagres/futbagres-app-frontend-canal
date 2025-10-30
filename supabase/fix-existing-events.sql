-- SCRIPT DE CORREÇÃO PARA EVENTOS EXISTENTES
-- Execute este script para corrigir os dados antes de adicionar a constraint

-- Ver quantos eventos estão com problema
SELECT 
  recorrencia,
  COUNT(*) as total,
  SUM(CASE WHEN recorrencia = 'unico' AND data_evento IS NULL THEN 1 ELSE 0 END) as unicos_sem_data,
  SUM(CASE WHEN recorrencia = 'semanal' AND dia_semana IS NULL THEN 1 ELSE 0 END) as semanais_sem_dia
FROM events
GROUP BY recorrencia;

-- OPÇÃO 1: Definir datas padrão para eventos únicos sem data
-- (define para daqui a 7 dias)
UPDATE events
SET data_evento = CURRENT_DATE + INTERVAL '7 days'
WHERE recorrencia = 'unico' 
  AND data_evento IS NULL;

-- OPÇÃO 2: Definir dia da semana padrão para eventos semanais
-- (define como sábado - ajuste se necessário)
UPDATE events
SET dia_semana = 6  -- 6 = Sábado
WHERE recorrencia = 'semanal' 
  AND dia_semana IS NULL;

-- ALTERNATIVA: Se preferir deletar eventos problemáticos
-- (CUIDADO: Isso vai apagar dados!)
-- DELETE FROM events 
-- WHERE (recorrencia = 'unico' AND data_evento IS NULL)
--    OR (recorrencia = 'semanal' AND dia_semana IS NULL);

-- Verificar se ainda há problemas
SELECT 
  id,
  titulo,
  recorrencia,
  data_evento,
  dia_semana,
  CASE 
    WHEN recorrencia = 'unico' AND data_evento IS NULL THEN '❌ Evento único sem data'
    WHEN recorrencia = 'semanal' AND dia_semana IS NULL THEN '❌ Evento semanal sem dia'
    ELSE '✅ OK'
  END as status
FROM events
WHERE (recorrencia = 'unico' AND data_evento IS NULL)
   OR (recorrencia = 'semanal' AND dia_semana IS NULL);

-- Se a consulta acima não retornar nada, você pode adicionar a constraint
