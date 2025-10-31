# Sistema de Perfil de Jogador e BagreScore

## 📋 Visão Geral

Sistema completo de perfil de jogador implementado com:
- Seleção de posição no futebol
- Autoavaliação de habilidades (0.5 a 5 estrelas)
- BagreScore: sistema de avaliações feitas por outros jogadores após eventos

## ✅ O Que Foi Implementado

### 1. Tipos e Banco de Dados

#### Tipos TypeScript (`/types/database.types.ts`)
```typescript
// Novo tipo para posições
export type PlayerPosition = 'goleiro' | 'zagueiro' | 'lateral' | 'volante' | 'meia' | 'atacante';

// Campos adicionados ao Profile
interface Profile {
  posicao: PlayerPosition | null;
  auto_defesa: number | null;      // 0.5 a 5.0
  auto_velocidade: number | null;
  auto_passe: number | null;
  auto_chute: number | null;
  auto_drible: number | null;
}

// Nova interface para avaliações
interface PlayerEvaluation {
  event_id: string;
  avaliador_id: string;
  avaliado_id: string;
  defesa: number;      // 0.5 a 5.0
  velocidade: number;
  passe: number;
  chute: number;
  drible: number;
}
```

#### Migrações SQL

**`/supabase/add-player-profile-fields.sql`**
- Adiciona coluna `posicao` com constraint (6 posições válidas)
- Adiciona 5 colunas de autoavaliação com constraints:
  - Valores entre 0.5 e 5.0
  - Incrementos de 0.5 (permite meias estrelas)
  - Check: `MOD(valor * 10, 5) = 0`

**`/supabase/create-player-evaluations-table.sql`**
- Tabela `player_evaluations` com:
  - 5 habilidades avaliadas (defesa, velocidade, passe, chute, drible)
  - Constraint: uma avaliação por jogador por evento
  - Constraint: não pode se autoavaliar
  - RLS: apenas participantes confirmados podem avaliar
  - Avaliações são públicas (todos podem ver)

### 2. Componentes

#### StarRating (`/app/components/StarRating.tsx`)
Componente reutilizável para exibir e selecionar estrelas:

**Features:**
- Suporta valores de 0.5 a 5.0 (meias estrelas)
- Interativo: clique na metade esquerda = meio, direita = inteiro
- Hover mostra preview da nota
- 3 tamanhos: sm, md, lg
- Modo readonly para exibição
- Opcional: mostrar valor numérico
- Opcional: label para o campo

**Uso:**
```tsx
<StarRating
  label="⚽ Chute"
  value={4.5}
  onChange={(value) => handleChange(value)}
  showValue
  size="md"
/>
```

### 3. Página de Perfil Renovada (`/app/perfil/page.tsx`)

#### Seção 1: Dados Pessoais
- Nome completo
- Email
- Avatar com inicial

#### Seção 2: Minha Posição ⚽
- Dropdown para selecionar posição
- 6 opções com emojis:
  - 🧤 Goleiro
  - 🛡️ Zagueiro
  - ➡️ Lateral
  - ⚙️ Volante
  - 🎯 Meia
  - ⚡ Atacante

#### Seção 3: Autoavaliação ⭐
- 5 campos com componente StarRating:
  - 🛡️ Defesa
  - ⚡ Velocidade
  - 🎯 Passe
  - ⚽ Chute
  - 🎨 Drible
- Usuário pode avaliar suas próprias habilidades
- Valores salvos no banco

#### Seção 4: BagreScore 🏆
**Quando há avaliações:**
- Card destaque com média geral (nota de 0.5 a 5.0)
- Total de avaliações recebidas
- Grid com médias por habilidade (5 cards)
- Cada card mostra nota numérica + estrelas em readonly
- Histórico de avaliações em lista scrollable:
  - Nome do evento
  - Nome do avaliador
  - Data da avaliação
  - Nota média da avaliação
  - Detalhamento das 5 notas

**Quando não há avaliações:**
- Empty state amigável
- Incentivo para participar de eventos

### 4. Lógica de Cálculo do BagreScore

A página carrega automaticamente as avaliações ao abrir:

```typescript
// Busca todas as avaliações recebidas
const { data } = await supabase
  .from("player_evaluations")
  .select(`
    defesa, velocidade, passe, chute, drible, created_at,
    events (titulo),
    profiles!avaliador_id (nome)
  `)
  .eq("avaliado_id", user.id)
  .order("created_at", { ascending: false });

// Calcula médias
const medias = {
  defesa: soma_defesa / total,
  velocidade: soma_velocidade / total,
  // ...
};

// Média geral = média das 5 habilidades
const mediaGeral = (defesa + velocidade + passe + chute + drible) / 5;
```

## 🔒 Segurança (RLS)

### Tabela `player_evaluations`

**Quem pode ver:**
- ✅ Todos (avaliações são públicas)

**Quem pode criar:**
- ✅ Participantes confirmados do evento
- ✅ Apenas pode avaliar outros participantes confirmados
- ❌ Não pode se autoavaliar

**Quem pode atualizar/deletar:**
- ✅ Apenas o próprio avaliador

**Constraints:**
- Uma avaliação por dupla (avaliador, avaliado) por evento
- Não pode avaliar a si mesmo

## 📊 Estrutura de Dados

### Exemplo de Profile
```json
{
  "id": "uuid",
  "nome": "João Silva",
  "email": "joao@example.com",
  "posicao": "atacante",
  "auto_defesa": 2.5,
  "auto_velocidade": 4.5,
  "auto_passe": 3.0,
  "auto_chute": 4.0,
  "auto_drible": 3.5
}
```

### Exemplo de PlayerEvaluation
```json
{
  "id": "uuid",
  "event_id": "uuid-do-evento",
  "avaliador_id": "uuid-jogador-1",
  "avaliado_id": "uuid-jogador-2",
  "defesa": 4.0,
  "velocidade": 4.5,
  "passe": 3.5,
  "chute": 4.0,
  "drible": 5.0,
  "created_at": "2025-10-31T..."
}
```

## 🚀 Como Usar

### Para o Jogador:

1. **Configurar Perfil:**
   - Acesse "Perfil" no menu
   - Selecione sua posição
   - Faça sua autoavaliação nas 5 habilidades
   - Salve as alterações

2. **Ver seu BagreScore:**
   - Mesma página de perfil, role até a seção BagreScore
   - Veja sua média geral e por habilidade
   - Consulte o histórico de avaliações

### Para Avaliações:

**Próximos passos (ainda não implementados):**
- Modal de avaliação após eventos
- Notificação para avaliar participantes
- Sistema de lembretes

## 📋 Próximas Tarefas

### 1. Modal de Avaliação Pós-Evento
**O que criar:**
- Componente `EvaluationModal.tsx`
- Lista todos os participantes confirmados (exceto você)
- Para cada jogador:
  - Nome e foto
  - 5 campos StarRating (defesa, velocidade, passe, chute, drible)
- Botão "Enviar Avaliações"
- Salvana tabela `player_evaluations`

**Quando exibir:**
- Após evento ter data/hora passada
- Usuário foi participante confirmado
- Ainda não avaliou todos os participantes

### 2. Trigger no Dashboard
**O que adicionar:**
- Query que busca eventos finalizados onde usuário participou
- Verificar quais participantes ainda não foram avaliados
- Exibir banner/card: "Você tem X jogadores para avaliar no evento Y"
- Botão que abre o EvaluationModal

### 3. Notificações
**Ideias:**
- Badge no menu "Perfil" quando há avaliações pendentes
- Email/push notification lembrando de avaliar
- Prazo: até X dias após o evento

### 4. Melhorias Futuras
- Ranking de jogadores por BagreScore
- Filtrar jogadores por posição
- Gráfico radar das habilidades
- Comparar autoavaliação vs BagreScore
- Badge de "Jogador mais bem avaliado do mês"
- Sistema de emblemas/conquistas

## 🎨 UI/UX Implementado

### Design Responsivo
- Grid adaptável (1 coluna mobile, 2 colunas desktop)
- Cards com padding e spacing consistentes
- Cores: green-600 para destaques, yellow para BagreScore

### Dark Mode
- Totalmente suportado
- Cores ajustadas para ambos os temas
- Bordas e backgrounds adaptados

### Feedback Visual
- Loading spinner enquanto carrega BagreScore
- Empty state quando não há avaliações
- Success/error messages ao salvar
- Hover effects nos componentes interativos

### Acessibilidade
- Labels descritivos em todos os campos
- Emojis para identificação visual rápida
- Contraste adequado de cores
- Componentes focáveis

## 🛠️ Tecnologias Utilizadas

- **Next.js 16**: Framework React
- **TypeScript**: Tipagem forte
- **Tailwind CSS**: Estilização
- **Supabase**: Banco de dados PostgreSQL + RLS
- **React Hooks**: useState, useEffect

## 📝 Comandos SQL para Executar

Execute na ordem:

```sql
-- 1. Adicionar campos ao perfil
\i supabase/add-player-profile-fields.sql

-- 2. Criar tabela de avaliações
\i supabase/create-player-evaluations-table.sql
```

Ou copie e cole o conteúdo no SQL Editor do Supabase.

## ✅ Checklist de Implementação

- [x] Tipos TypeScript atualizados
- [x] Migration SQL para campos de perfil
- [x] Migration SQL para tabela de avaliações
- [x] Componente StarRating criado
- [x] Seção de posição no perfil
- [x] Seção de autoavaliação no perfil
- [x] Seção de BagreScore no perfil
- [x] Cálculo de médias do BagreScore
- [x] Histórico de avaliações
- [x] RLS policies configuradas
- [x] Build passando sem erros
- [ ] Modal de avaliação pós-evento
- [ ] Trigger para solicitar avaliações
- [ ] Notificações de avaliações pendentes

## 🎯 Resultado

Sistema completo de perfil de jogador com:
- **Posição:** Jogador escolhe sua posição
- **Autoavaliação:** Jogador se avalia em 5 habilidades
- **BagreScore:** Média das avaliações recebidas de outros jogadores
- **Histórico:** Lista completa de todas as avaliações
- **Segurança:** RLS garante que apenas participantes podem avaliar

Próximo passo: Criar o modal para avaliar outros jogadores após os eventos!
