-- Script para inserir 19 jogadores de teste em um evento
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- ========================================
-- PASSO 1: Defina o ID do evento aqui
-- ========================================
-- Substitua pelo ID do seu evento real!
DO $$
DECLARE
  target_event_id UUID := 'd6234f8e-e2fc-46ae-9de9-1695b2d4bbb0'; -- ⚠️ ALTERE AQUI!
  player_ids UUID[];
  player_names TEXT[] := ARRAY[
    'Carlos Silva',
    'João Santos',
    'Pedro Oliveira',
    'Lucas Costa',
    'Rafael Lima',
    'Bruno Souza',
    'Felipe Pereira',
    'Rodrigo Alves',
    'Gustavo Rocha',
    'Thiago Martins',
    'Diego Fernandes',
    'Leonardo Barbosa',
    'Mateus Ribeiro',
    'Vinícius Cardoso',
    'Gabriel Araújo',
    'André Nascimento',
    'Marcelo Dias',
    'Fábio Monteiro',
    'Ricardo Carvalho'
  ];
  player_positions TEXT[] := ARRAY[
    'goleiro', 'zagueiro', 'zagueiro', 'lateral', 'lateral',
    'volante', 'volante', 'meia', 'meia', 'meia',
    'atacante', 'atacante', 'atacante', 'zagueiro', 'volante',
    'meia', 'atacante', 'lateral', 'volante'
  ];
  -- Avaliações variadas (0.5 a 5.0) - apenas múltiplos de 0.5
  auto_defesa_scores DECIMAL[] := ARRAY[
    4.5, 4.0, 4.0, 3.5, 3.0, 
    3.0, 3.0, 2.5, 2.5, 2.0,
    2.0, 1.5, 4.0, 3.5, 3.5,
    3.0, 3.0, 2.5, 2.5
  ];
  auto_velocidade_scores DECIMAL[] := ARRAY[
    2.0, 2.5, 3.0, 3.5, 4.0,
    4.5, 4.0, 4.0, 3.5, 3.0,
    3.0, 3.0, 2.5, 2.5, 4.5,
    4.0, 3.5, 3.5, 3.0
  ];
  auto_passe_scores DECIMAL[] := ARRAY[
    3.0, 3.5, 4.0, 4.0, 3.5,
    3.5, 3.0, 4.5, 4.5, 4.0,
    4.0, 3.5, 3.0, 3.0, 3.5,
    4.0, 3.5, 3.0, 3.0
  ];
  auto_chute_scores DECIMAL[] := ARRAY[
    2.5, 3.0, 3.0, 2.5, 2.5,
    2.0, 2.0, 3.5, 4.0, 4.0,
    4.5, 5.0, 4.5, 3.0, 2.5,
    3.0, 4.0, 2.5, 2.5
  ];
  auto_drible_scores DECIMAL[] := ARRAY[
    1.5, 2.0, 2.5, 3.0, 3.5,
    3.0, 3.0, 4.0, 4.5, 4.0,
    4.0, 4.5, 3.5, 3.0, 3.5,
    4.0, 4.0, 3.0, 2.5
  ];
  i INTEGER;
BEGIN
  -- Verificar se o evento existe
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = target_event_id) THEN
    RAISE EXCEPTION 'Evento com ID % não encontrado! Altere o target_event_id no script.', target_event_id;
  END IF;

  -- Criar 19 usuários fake e perfis
  FOR i IN 1..19 LOOP
    -- Gerar UUID para o jogador
    player_ids[i] := gen_random_uuid();
    
    -- Inserir na tabela auth.users primeiro
    -- O trigger handle_new_user() vai criar o perfil automaticamente
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      player_ids[i],
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'jogador' || i || '@teste.com',
      crypt('senha123', gen_salt('bf')), -- Senha genérica
      NOW(),
      jsonb_build_object('nome', player_names[i]),
      NOW(),
      NOW(),
      '',
      ''
    );
    
    -- Atualizar perfil com dados adicionais (trigger já criou o básico)
    UPDATE profiles
    SET
      posicao = player_positions[i],
      auto_defesa = auto_defesa_scores[i],
      auto_velocidade = auto_velocidade_scores[i],
      auto_passe = auto_passe_scores[i],
      auto_chute = auto_chute_scores[i],
      auto_drible = auto_drible_scores[i],
      chave_pix = '123.456.789-' || LPAD(i::TEXT, 2, '0'),
      updated_at = NOW()
    WHERE id = player_ids[i];
    
    -- Inserir inscrição no evento
    INSERT INTO event_participants (
      id,
      event_id,
      user_id,
      status,
      presence_status,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      target_event_id,
      player_ids[i],
      'confirmado', -- Todos confirmados e pagos
      'confirmado', -- Todos disseram que vão
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Jogador % (%) criado e inscrito', i, player_names[i];
  END LOOP;

  RAISE NOTICE '✅ 19 jogadores de teste criados com sucesso!';
  RAISE NOTICE 'IDs gerados: %', player_ids;
END $$;

-- ========================================
-- PASSO 2: Verificar os jogadores criados
-- ========================================
-- Descomente as linhas abaixo para ver os jogadores

-- SELECT 
--   p.nome,
--   p.posicao,
--   ROUND((p.auto_defesa + p.auto_velocidade + p.auto_passe + p.auto_chute + p.auto_drible) / 5, 2) as media_geral,
--   ep.status,
--   ep.presence_status
-- FROM profiles p
-- JOIN event_participants ep ON ep.user_id = p.id
-- WHERE ep.event_id = 'SEU_EVENT_ID_AQUI' -- ⚠️ ALTERE AQUI TAMBÉM!
-- ORDER BY media_geral DESC;

-- ========================================
-- PASSO 3 (OPCIONAL): Adicionar avaliações históricas
-- ========================================
-- Este passo adiciona avaliações de outros jogadores para simular histórico
-- Descomente se quiser testar com avaliações históricas

/*
DO $$
DECLARE
  target_event_id UUID := 'SEU_EVENT_ID_AQUI'; -- ⚠️ ALTERE AQUI!
  player_record RECORD;
  evaluator_id UUID;
  random_variation DECIMAL;
BEGIN
  -- Para cada jogador do evento
  FOR player_record IN 
    SELECT ep.user_id, p.nome, p.auto_defesa, p.auto_velocidade, p.auto_passe, p.auto_chute, p.auto_drible
    FROM event_participants ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE ep.event_id = target_event_id
  LOOP
    -- Criar 3-5 avaliações históricas para cada jogador
    FOR i IN 1..(3 + floor(random() * 3)::int) LOOP
      -- Escolher um avaliador aleatório (outro jogador do evento)
      SELECT user_id INTO evaluator_id
      FROM event_participants
      WHERE event_id = target_event_id 
        AND user_id != player_record.user_id
      ORDER BY random()
      LIMIT 1;
      
      -- Inserir avaliação com pequena variação (+/- 0.5)
      INSERT INTO player_evaluations (
        id,
        avaliador_id,
        avaliado_id,
        event_id,
        defesa,
        velocidade,
        passe,
        chute,
        drible,
        comentario,
        created_at
      ) VALUES (
        gen_random_uuid(),
        evaluator_id,
        player_record.user_id,
        target_event_id,
        GREATEST(0.5, LEAST(5.0, player_record.auto_defesa + (random() - 0.5))),
        GREATEST(0.5, LEAST(5.0, player_record.auto_velocidade + (random() - 0.5))),
        GREATEST(0.5, LEAST(5.0, player_record.auto_passe + (random() - 0.5))),
        GREATEST(0.5, LEAST(5.0, player_record.auto_chute + (random() - 0.5))),
        GREATEST(0.5, LEAST(5.0, player_record.auto_drible + (random() - 0.5))),
        'Avaliação automática de teste',
        NOW() - (random() * interval '30 days')
      );
    END LOOP;
    
    RAISE NOTICE 'Avaliações históricas criadas para %', player_record.nome;
  END LOOP;
  
  RAISE NOTICE '✅ Avaliações históricas criadas!';
END $$;
*/

-- ========================================
-- LIMPEZA (OPCIONAL)
-- ========================================
-- Para remover os jogadores de teste depois:
/*
-- Remover inscrições
DELETE FROM event_participants 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE email LIKE 'jogador%@teste.com'
);

-- Remover perfis (CASCADE vai deletar de auth.users também)
DELETE FROM profiles 
WHERE email LIKE 'jogador%@teste.com';

-- OU remover direto de auth.users (CASCADE vai deletar profiles e participants)
DELETE FROM auth.users
WHERE email LIKE 'jogador%@teste.com';
*/
