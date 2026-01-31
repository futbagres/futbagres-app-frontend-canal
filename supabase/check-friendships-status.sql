-- Verificar Status da Tabela Friendships
-- Execute este script primeiro para ver se a tabela já existe

-- 1. Verificar se tabela existe
SELECT
  'Tabela friendships existe:' as status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'friendships'
  ) THEN '✅ SIM' ELSE '❌ NÃO - Execute create-friendships-table.sql' END as resultado;

-- 2. Se existir, verificar estrutura
SELECT
  'RLS habilitado:' as status,
  CASE WHEN rowsecurity THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'friendships';

-- 3. Contar políticas RLS
SELECT
  'Políticas RLS:' as status,
  COUNT(*) || ' políticas criadas' as resultado
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'friendships';

-- 4. Contar índices
SELECT
  'Índices criados:' as status,
  COUNT(*) || ' índices' as resultado
FROM pg_indexes
WHERE tablename = 'friendships' AND schemaname = 'public';

-- 5. Verificar views
SELECT
  'Views de contadores:' as status,
  COUNT(*) || ' views criadas' as resultado
FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('follower_counts', 'following_counts');

-- 6. Verificar dados existentes
SELECT
  'Relacionamentos existentes:' as status,
  COUNT(*) || ' relacionamentos' as resultado
FROM public.friendships;

-- 7. Verificar estrutura da tabela
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'friendships'
ORDER BY ordinal_position;