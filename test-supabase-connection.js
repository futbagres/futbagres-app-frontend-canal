// Script para testar conexão com Supabase e verificar tabela events
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '[EXISTE]' : '[NÃO EXISTE]');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...\n');
  
  try {
    // Testar se a tabela events existe
    console.log('1️⃣ Verificando tabela events...');
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ TABELA "events" NÃO EXISTE!');
        console.error('\n📋 Você precisa executar o script SQL:');
        console.error('   1. Acesse https://supabase.com');
        console.error('   2. Vá em SQL Editor');
        console.error('   3. Cole o conteúdo de supabase/events-table.sql');
        console.error('   4. Execute o script\n');
      } else {
        console.error('❌ Erro ao acessar tabela:', error.message);
        console.error('Código:', error.code);
        console.error('Detalhes:', error.hint);
      }
      process.exit(1);
    }
    
    console.log('✅ Tabela events existe!');
    console.log('   Registros encontrados:', data?.length || 0);
    
    // Testar inserção
    console.log('\n2️⃣ Testando inserção de evento...');
    const testEvent = {
      titulo: 'Teste de Conexão',
      tipo_futebol: 'campo',
      max_participantes: 10,
      recorrencia: 'unico',
      horario_inicio: '18:00',
      horario_fim: '19:00',
      valor_por_pessoa: 20.00,
      local: 'Campo de teste',
      descricao: 'Evento de teste - pode deletar',
      criador_id: '00000000-0000-0000-0000-000000000000', // ID fictício
      status: 'ativo'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('events')
      .insert([testEvent])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError.message);
      console.error('Código:', insertError.code);
      if (insertError.code === '23503') {
        console.error('\n⚠️  ERRO: criador_id não existe (esperado para este teste)');
        console.error('   Isso é normal - a tabela existe mas precisa de um usuário real');
        console.error('   ✅ A estrutura da tabela está CORRETA!\n');
      }
    } else {
      console.log('✅ Inserção bem-sucedida!');
      console.log('   Evento criado:', insertData);
      
      // Deletar o evento de teste
      await supabase
        .from('events')
        .delete()
        .eq('id', insertData.id);
      console.log('   Evento de teste removido');
    }
    
    console.log('\n✨ DIAGNÓSTICO COMPLETO!\n');
    
  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
  }
}

testConnection();
