-- Adicionar campo de avatar na tabela profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentário explicativo
COMMENT ON COLUMN profiles.avatar_url IS 'URL da foto de perfil no Supabase Storage';