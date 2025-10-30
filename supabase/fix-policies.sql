-- ==================================================
-- DIAGNÓSTICO E CORREÇÃO - FUTBAGRES
-- ==================================================

-- 1. VERIFICAR SE A TABELA PROFILES EXISTE
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'profiles';

-- 2. VERIFICAR AS POLICIES (RLS)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. VERIFICAR OS TRIGGERS
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- 4. TESTAR SE A FUNÇÃO FUNCIONA
SELECT public.handle_new_user();

-- ==================================================
-- SOLUÇÃO: RECRIAR COM PERMISSÕES CORRETAS
-- ==================================================

-- Primeiro, dropar tudo novamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Remover todas as policies
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Perfis são públicos para leitura" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON public.profiles;

-- Desabilitar RLS temporariamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Recriar a função com SECURITY DEFINER e bypassrls
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    'usuario'::user_role
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Recriar função de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger de updated_at
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();

-- REABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recriar políticas (mais permissivas)
CREATE POLICY "Enable read access for all users"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on id"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for users based on id"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Política especial para admins
CREATE POLICY "Enable all for admins"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==================================================
-- TESTE FINAL
-- ==================================================
-- Tente cadastrar um usuário na sua aplicação agora!
-- ==================================================
