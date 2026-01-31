// Script para executar SQL no Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '[EXISTE]' : '[NÃO EXISTE]');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLFile(filePath) {
  console.log(`🔍 Executando SQL: ${filePath}\n`);

  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    // Dividir o SQL em statements individuais (por ponto e vírgula)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`📝 Executando statement ${i + 1}/${statements.length}...`);

        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            console.log(`⚠️  Erro no statement ${i + 1}:`, error.message);
            // Continuar com os próximos statements
          } else {
            console.log(`✅ Statement ${i + 1} executado com sucesso`);
          }
        } catch (err) {
          console.log(`⚠️  Erro ao executar statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n✨ Execução do SQL concluída!\n');

  } catch (err) {
    console.error('❌ Erro ao ler/executar arquivo SQL:', err.message);
  }
}

// Verificar argumentos da linha de comando
const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ Uso: node execute-sql.js <caminho-do-arquivo-sql>');
  process.exit(1);
}

executeSQLFile(filePath);