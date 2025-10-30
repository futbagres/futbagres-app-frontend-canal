-- ==================================================
-- CORREÇÃO: RECURSÃO INFINITA NAS POLÍTICAS
-- ==================================================

-- 1. Remover TODAS as políticas
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable all for admins" ON public.profiles;

-- 2. Criar políticas SIMPLES (SEM RECURSÃO)

-- Leitura: Todos podem ler todos os perfis
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (true);

-- Inserção: Apenas usuários autenticados podem inserir
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Atualização: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Deleção: Usuários podem deletar apenas seu próprio perfil
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ==================================================
-- VERIFICAÇÃO
-- ==================================================
-- Execute esta query para verificar as políticas:
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- ==================================================
-- TESTE
-- ==================================================
-- Tente acessar a página /perfil novamente!
-- ==================================================
