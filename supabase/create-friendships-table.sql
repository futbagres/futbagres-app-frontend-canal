-- Sistema de Seguidores/Amigos para Futebagres
-- Execute estes scripts no SQL Editor do Supabase

-- ============================================================
-- 0. VERIFICAR SE A TABELA JÁ EXISTE
-- ============================================================

-- Verificar se a tabela friendships já existe
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'friendships'
) as table_exists;

-- Se a tabela já existe, você pode:
-- 1. Pular este script (tabela já está criada)
-- 2. Ou executar o DROP abaixo para recriar

-- OPCIONAL: Dropar tabela existente (CUIDADO: apaga todos os dados!)
-- DROP TABLE IF EXISTS public.friendships CASCADE;

-- ============================================================
-- 1. CRIAR TABELA DE RELACIONAMENTOS DE AMIZADE (SOMENTE SE NÃO EXISTIR)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Impedir auto-seguir e duplicatas
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

-- ============================================================
-- 2. HABILITAR RLS (Row Level Security) - SÓ SE AINDA NÃO ESTIVER HABILITADO
-- ============================================================

-- Verificar se RLS já está habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'friendships';

-- Habilitar RLS se não estiver habilitado
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'friendships';

-- Políticas de segurança (só cria se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships'
    AND policyname = 'Usuários podem ver seus próprios relacionamentos'
  ) THEN
    CREATE POLICY "Usuários podem ver seus próprios relacionamentos"
      ON public.friendships FOR SELECT
      USING (auth.uid() = follower_id OR auth.uid() = following_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships'
    AND policyname = 'Usuários podem ver relacionamentos públicos'
  ) THEN
    CREATE POLICY "Usuários podem ver relacionamentos públicos"
      ON public.friendships FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships'
    AND policyname = 'Usuários podem criar relacionamentos'
  ) THEN
    CREATE POLICY "Usuários podem criar relacionamentos"
      ON public.friendships FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = follower_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships'
    AND policyname = 'Usuários podem atualizar seus relacionamentos'
  ) THEN
    CREATE POLICY "Usuários podem atualizar seus relacionamentos"
      ON public.friendships FOR UPDATE
      USING (auth.uid() = follower_id)
      WITH CHECK (auth.uid() = follower_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships'
    AND policyname = 'Usuários podem deletar seus relacionamentos'
  ) THEN
    CREATE POLICY "Usuários podem deletar seus relacionamentos"
      ON public.friendships FOR DELETE
      USING (auth.uid() = follower_id);
  END IF;
END $$;

-- ============================================================
-- 3. FUNÇÃO PARA ATUALIZAR UPDATED_AT (SÓ CRIA SE NÃO EXISTIR)
-- ============================================================

-- Verificar se a função já existe
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'handle_friendships_updated_at';

-- Criar função se não existir
CREATE OR REPLACE FUNCTION public.handle_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se o trigger já existe
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'friendships' AND trigger_name = 'on_friendships_updated';

-- Criar trigger se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'friendships'
    AND trigger_name = 'on_friendships_updated'
  ) THEN
    CREATE TRIGGER on_friendships_updated
      BEFORE UPDATE ON public.friendships
      FOR EACH ROW EXECUTE FUNCTION public.handle_friendships_updated_at();
  END IF;
END $$;

-- ============================================================
-- 4. ÍNDICES PARA PERFORMANCE (CRIA SÓ SE NÃO EXISTIREM)
-- ============================================================

-- Verificar índices existentes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'friendships' AND schemaname = 'public';

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_friendships_follower ON public.friendships(follower_id);
CREATE INDEX IF NOT EXISTS idx_friendships_following ON public.friendships(following_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- ============================================================
-- 5. VIEWS PARA CONTADORES (OPCIONAL)
-- ============================================================

-- Verificar views existentes
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('follower_counts', 'following_counts');

-- View para contar seguidores de cada usuário (cria/sobrescreve)
CREATE OR REPLACE VIEW public.follower_counts AS
SELECT
  following_id as user_id,
  COUNT(*) as followers_count
FROM public.friendships
WHERE status = 'active'
GROUP BY following_id;

-- View para contar quem cada usuário segue (cria/sobrescreve)
CREATE OR REPLACE VIEW public.following_counts AS
SELECT
  follower_id as user_id,
  COUNT(*) as following_count
FROM public.friendships
WHERE status = 'active'
GROUP BY follower_id;

-- ============================================================
-- 6. VIEW PARA FACILITAR JOINS COM PERFIS
-- ============================================================

-- View que junta friendships com perfis dos usuários
CREATE OR REPLACE VIEW public.friendships_with_profiles AS
SELECT
  f.id,
  f.follower_id,
  f.following_id,
  f.status,
  f.created_at,
  f.updated_at,
  -- Perfil do seguidor
  json_build_object(
    'id', fp.id,
    'nome', fp.nome,
    'avatar_url', fp.avatar_url,
    'posicao', fp.posicao
  ) as follower_profile,
  -- Perfil do seguido
  json_build_object(
    'id', fwp.id,
    'nome', fwp.nome,
    'avatar_url', fwp.avatar_url,
    'posicao', fwp.posicao
  ) as following_profile
FROM public.friendships f
LEFT JOIN public.profiles fp ON f.follower_id = fp.id
LEFT JOIN public.profiles fwp ON f.following_id = fwp.id;

-- ============================================================
-- CONFIGURAÇÃO CONCLUÍDA!
-- ============================================================

-- Verificar configuração final
SELECT
  'Tabela existe:' as check_type,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='friendships') THEN 'Sim' ELSE 'Não' END as result
UNION ALL
SELECT
  'RLS habilitado:' as check_type,
  CASE WHEN rowsecurity THEN 'Sim' ELSE 'Não' END as result
FROM pg_tables
WHERE schemaname='public' AND tablename='friendships'
UNION ALL
SELECT
  'Políticas criadas:' as check_type,
  COUNT(*)::text as result
FROM pg_policies
WHERE schemaname='public' AND tablename='friendships'
UNION ALL
SELECT
  'Índices criados:' as check_type,
  COUNT(*)::text as result
FROM pg_indexes
WHERE tablename='friendships' AND schemaname='public'
UNION ALL
SELECT
  'Views criadas:' as check_type,
  COUNT(*)::text as result
FROM information_schema.views
WHERE table_schema='public' AND table_name IN ('follower_counts', 'following_counts', 'friendships_with_profiles');

-- ============================================================
-- TESTE A CONFIGURAÇÃO
-- ============================================================

-- Teste 1: Inserir um relacionamento de teste (substitua os IDs por IDs reais de usuários)
-- INSERT INTO public.friendships (follower_id, following_id)
-- VALUES ('user-id-1', 'user-id-2');

-- Teste 2: Verificar contadores
-- SELECT * FROM public.follower_counts;
-- SELECT * FROM public.following_counts;

-- Teste 3: Verificar relacionamentos
-- SELECT * FROM public.friendships LIMIT 5;

-- ============================================================
-- PRÓXIMOS PASSOS
-- ============================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Execute o script: add-new-follower-notification.sql
-- 3. Teste o sistema no aplicativo
-- 4. Verifique os logs do console para debug