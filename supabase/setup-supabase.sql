-- ==================================================
-- CONFIGURAÇÃO DO SUPABASE PARA O FUTBAGRES
-- ==================================================
-- Execute este script no SQL Editor do Supabase
-- (Project > SQL Editor > New Query)
-- ==================================================

-- 1. Criar enum para as roles de usuário
CREATE TYPE user_role AS ENUM ('admin', 'usuario', 'criador_evento');

-- 2. Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role user_role DEFAULT 'usuario' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança

-- Usuários podem ler seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Usuários podem ver perfis de outros usuários (público)
CREATE POLICY "Perfis são públicos para leitura"
  ON public.profiles FOR SELECT
  USING (true);

-- Usuários podem atualizar seu próprio perfil (exceto role e id)
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Apenas admins podem atualizar roles
CREATE POLICY "Admins podem atualizar qualquer perfil"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Criar função para criar perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    'usuario'::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger que executa após criar novo usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para updated_at
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==================================================
-- CONFIGURAÇÃO CONCLUÍDA!
-- ==================================================
-- Próximos passos:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Para criar o primeiro admin, execute:
--    UPDATE public.profiles 
--    SET role = 'admin' 
--    WHERE email = 'seu-email@exemplo.com';
-- ==================================================
