// Script para verificar status da tabela friendships
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFriendshipsStatus() {
  console.log('🔍 Verificando status da tabela friendships...\n');

  try {
    // 1. Verificar se tabela existe
    console.log('1️⃣ Verificando se tabela friendships existe...');
    const { data: tableExists, error: tableError } = await supabase
      .from('friendships')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('❌ Tabela friendships NÃO existe');
      console.log('\n📋 Execute o script: supabase/create-friendships-table.sql\n');
      return;
    } else if (tableError) {
      console.log('❌ Erro ao verificar tabela:', tableError.message);
      return;
    }

    console.log('✅ Tabela friendships existe!');

    // 2. Verificar estrutura básica
    console.log('\n2️⃣ Verificando estrutura da tabela...');
    const { data: structureData, error: structureError } = await supabase
      .from('friendships')
      .select('*')
      .limit(0); // Apenas para ver estrutura

    if (structureError) {
      console.log('❌ Erro ao verificar estrutura:', structureError.message);
    } else {
      console.log('✅ Estrutura acessível');
    }

    // 3. Contar relacionamentos existentes
    console.log('\n3️⃣ Verificando relacionamentos existentes...');
    const { count, error: countError } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Erro ao contar relacionamentos:', countError.message);
    } else {
      console.log(`✅ ${count} relacionamentos encontrados`);
    }

    // 4. Testar views de contadores
    console.log('\n4️⃣ Testando views de contadores...');

    // Testar follower_counts
    try {
      const { data: followerData, error: followerError } = await supabase
        .from('follower_counts')
        .select('*')
        .limit(1);

      if (followerError) {
        console.log('❌ View follower_counts com erro:', followerError.message);
      } else {
        console.log('✅ View follower_counts funcionando');
      }
    } catch (err) {
      console.log('❌ Erro ao testar follower_counts:', err.message);
    }

    // Testar following_counts
    try {
      const { data: followingData, error: followingError } = await supabase
        .from('following_counts')
        .select('*')
        .limit(1);

      if (followingError) {
        console.log('❌ View following_counts com erro:', followingError.message);
      } else {
        console.log('✅ View following_counts funcionando');
      }
    } catch (err) {
      console.log('❌ Erro ao testar following_counts:', err.message);
    }

    console.log('\n✨ Verificação concluída!\n');

  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
  }
}

checkFriendshipsStatus();