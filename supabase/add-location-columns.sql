-- Adicionar colunas de latitude e longitude na tabela events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN events.latitude IS 'Latitude do local do evento para integração com mapas e clima';
COMMENT ON COLUMN events.longitude IS 'Longitude do local do evento para integração com mapas e clima';
