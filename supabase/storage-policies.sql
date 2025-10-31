-- Configuração do Bucket de Storage para Comprovantes de Pagamento
-- Execute estes comandos no Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. CRIAR BUCKET (Execute no Dashboard > Storage)
-- ============================================================
-- Nome: payment-receipts
-- Public: NÃO (deixar privado)

-- ============================================================
-- 2. POLÍTICAS RLS PARA STORAGE
-- ============================================================

-- Permitir usuários fazer upload dos próprios comprovantes
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Permitir usuários visualizar próprios comprovantes
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Permitir criadores de eventos visualizar comprovantes dos participantes
CREATE POLICY "Event creators can view participant receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE (storage.foldername(name))[1] = e.id::text
    AND e.criador_id = auth.uid()
  )
);

-- Permitir usuários deletar próprios comprovantes (opcional)
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================================
-- EXPLICAÇÃO DA ESTRUTURA DE PASTAS
-- ============================================================
-- Os comprovantes são salvos no formato:
-- payment-receipts/{event_id}/{user_id}/comprovante-{timestamp}.jpg
--
-- Onde:
-- - [1] = event_id (primeira pasta)
-- - [2] = user_id (segunda pasta)
-- - [3] = nome do arquivo
--
-- Exemplo:
-- payment-receipts/abc123/user456/comprovante-1698765432.jpg
--
-- As políticas garantem que:
-- 1. Usuário só pode fazer upload na própria pasta (user_id)
-- 2. Usuário pode ver próprios comprovantes
-- 3. Criador do evento pode ver comprovantes de todos participantes
-- 4. Usuário pode deletar próprios comprovantes

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
AND schemaname = 'storage';

-- ✅ Após executar, teste:
-- 1. Fazer upload de um comprovante como usuário
-- 2. Visualizar como criador do evento
-- 3. Tentar acessar comprovante de outro usuário (deve falhar)
