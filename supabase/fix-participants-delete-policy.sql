-- Corrigir política RLS para permitir usuários deletarem suas próprias inscrições
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Adicionar política para DELETE
CREATE POLICY "Usuários podem deletar própria inscrição"
  ON event_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Verificar políticas atuais (opcional)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'event_participants'
ORDER BY cmd, policyname;

-- ✅ Após executar, teste:
-- 1. Inscrever-se em um evento
-- 2. Cancelar a inscrição
-- 3. Verificar se o registro foi deletado
