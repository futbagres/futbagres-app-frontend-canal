-- Adicionar campos de perfil do jogador na tabela profiles

-- Adicionar coluna de posição
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS posicao VARCHAR(20) 
CHECK (posicao IN ('goleiro', 'zagueiro', 'lateral', 'volante', 'meia', 'atacante'));

-- Adicionar colunas de autoavaliação (notas de 0.5 a 5.0)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auto_defesa DECIMAL(2,1) 
CHECK (auto_defesa IS NULL OR (auto_defesa >= 0.5 AND auto_defesa <= 5.0 AND MOD(auto_defesa * 10, 5) = 0));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auto_velocidade DECIMAL(2,1) 
CHECK (auto_velocidade IS NULL OR (auto_velocidade >= 0.5 AND auto_velocidade <= 5.0 AND MOD(auto_velocidade * 10, 5) = 0));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auto_passe DECIMAL(2,1) 
CHECK (auto_passe IS NULL OR (auto_passe >= 0.5 AND auto_passe <= 5.0 AND MOD(auto_passe * 10, 5) = 0));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auto_chute DECIMAL(2,1) 
CHECK (auto_chute IS NULL OR (auto_chute >= 0.5 AND auto_chute <= 5.0 AND MOD(auto_chute * 10, 5) = 0));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auto_drible DECIMAL(2,1) 
CHECK (auto_drible IS NULL OR (auto_drible >= 0.5 AND auto_drible <= 5.0 AND MOD(auto_drible * 10, 5) = 0));

-- Comentários explicativos
COMMENT ON COLUMN profiles.posicao IS 'Posição do jogador no futebol';
COMMENT ON COLUMN profiles.auto_defesa IS 'Autoavaliação de defesa (0.5 a 5.0 com incrementos de 0.5)';
COMMENT ON COLUMN profiles.auto_velocidade IS 'Autoavaliação de velocidade (0.5 a 5.0 com incrementos de 0.5)';
COMMENT ON COLUMN profiles.auto_passe IS 'Autoavaliação de passe (0.5 a 5.0 com incrementos de 0.5)';
COMMENT ON COLUMN profiles.auto_chute IS 'Autoavaliação de chute (0.5 a 5.0 com incrementos de 0.5)';
COMMENT ON COLUMN profiles.auto_drible IS 'Autoavaliação de drible (0.5 a 5.0 com incrementos de 0.5)';

-- ✅ Campos de perfil do jogador adicionados com sucesso!
