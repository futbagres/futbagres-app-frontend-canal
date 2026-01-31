// Script para verificar dados de um usuário específico
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserProfile(userId) {
  console.log(`🔍 Verificando perfil do usuário: ${userId}\n`);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        nome,
        role,
        avatar_url,
        posicao,
        auto_defesa,
        auto_velocidade,
        auto_passe,
        auto_chute,
        auto_drible,
        chave_pix,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      return;
    }

    console.log('✅ Dados encontrados:');
    console.log(JSON.stringify(data, null, 2));

    // Verificar campos específicos
    console.log('\n📊 Análise dos campos:');
    console.log(`Nome: ${data.nome || 'NÃO PREENCHIDO'}`);
    console.log(`Email: ${data.email || 'NÃO PREENCHIDO'}`);
    console.log(`Posição: ${data.posicao || 'NÃO PREENCHIDO'}`);
    console.log(`Função: ${data.role || 'NÃO PREENCHIDO'}`);
    console.log(`Avatar: ${data.avatar_url ? 'SIM' : 'NÃO'}`);
    console.log(`Chave PIX: ${data.chave_pix || 'NÃO PREENCHIDO'}`);
    console.log(`Defesa: ${data.auto_defesa !== null ? data.auto_defesa : 'NÃO AVALIADO'}`);
    console.log(`Velocidade: ${data.auto_velocidade !== null ? data.auto_velocidade : 'NÃO AVALIADO'}`);
    console.log(`Passe: ${data.auto_passe !== null ? data.auto_passe : 'NÃO AVALIADO'}`);
    console.log(`Chute: ${data.auto_chute !== null ? data.auto_chute : 'NÃO AVALIADO'}`);
    console.log(`Drible: ${data.auto_drible !== null ? data.auto_drible : 'NÃO AVALIADO'}`);

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Usar o ID do usuário que você quer verificar
// Substitua pelo ID real do usuário que você quer testar
const testUserId = process.argv[2] || '52aa9daf-7bf6-4c3d-8aad-17c0d9a5cd1a'; // ID do usuário logado
checkUserProfile(testUserId);