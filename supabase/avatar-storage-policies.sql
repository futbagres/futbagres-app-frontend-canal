-- Configuração do Bucket de Storage para Avatares de Perfil
-- Execute estes comandos no Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. CRIAR BUCKET (Execute no Dashboard > Storage)
-- ============================================================
-- Nome: avatars
-- Public: SIM (para que as imagens sejam acessíveis publicamente)

-- ============================================================
-- 2. POLÍTICAS RLS PARA STORAGE DE AVATARES
-- ============================================================

-- Permitir usuários fazer upload do próprio avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir usuários visualizar qualquer avatar (público)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Permitir usuários atualizar próprio avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir usuários deletar próprio avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- EXPLICAÇÃO DA ESTRUTURA DE PASTAS
-- ============================================================
-- Os avatares são salvos no formato:
-- avatars/{user_id}/avatar.jpg
--
-- Onde:
-- - [1] = user_id (única pasta por usuário)
--
-- As políticas garantem que:
-- 1. Usuário só pode fazer upload na própria pasta (user_id)
-- 2. Qualquer usuário autenticado pode ver avatares
-- 3. Usuário pode atualizar/deletar próprio avatar

-- ============================================================
-- 3. VERIFICAR POLÍTICAS (Opcional)
-- ============================================================
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
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';

-- ✅ Após executar, teste:
-- 1. Fazer upload de um avatar como usuário
-- 2. Visualizar avatar de outro usuário
-- 3. Tentar sobrescrever avatar de outro usuário (deve falhar)