-- ==================================================
-- TABELA DE EVENTOS - FUTBAGRES
-- ==================================================

-- 1. Criar tabela de eventos
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo_futebol TEXT NOT NULL CHECK (tipo_futebol IN ('campo', 'salao', 'society')),
  max_participantes INTEGER NOT NULL,
  recorrencia TEXT NOT NULL CHECK (recorrencia IN ('unico', 'semanal')),
  dia_semana INTEGER CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado (null se único)
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  valor_por_pessoa DECIMAL(10, 2) DEFAULT 0,
  local TEXT,
  descricao TEXT,
  criador_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado', 'finalizado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Criar tabela de participantes dos eventos
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'talvez' CHECK (status IN ('confirmado', 'talvez', 'cancelado')),
  payment_status TEXT DEFAULT 'pendente' CHECK (payment_status IN ('pago', 'pendente', 'isento')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para events
CREATE POLICY "Eventos são públicos para leitura"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar eventos"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = criador_id);

CREATE POLICY "Criadores podem atualizar seus eventos"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid() = criador_id)
  WITH CHECK (auth.uid() = criador_id);

CREATE POLICY "Criadores podem deletar seus eventos"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = criador_id);

-- 5. Políticas para event_participants
CREATE POLICY "Participantes são públicos para leitura"
  ON public.event_participants FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem se inscrever em eventos"
  ON public.event_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem cancelar sua participação"
  ON public.event_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Trigger para updated_at em events
CREATE TRIGGER on_event_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_events_criador ON public.events(criador_id);
CREATE INDEX IF NOT EXISTS idx_events_horario ON public.events(horario_inicio);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_recorrencia ON public.events(recorrencia);
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.event_participants(user_id);

-- ==================================================
-- CONFIGURAÇÃO DE EVENTOS CONCLUÍDA!
-- ==================================================
