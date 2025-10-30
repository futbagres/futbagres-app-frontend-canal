# Sistema de Inscrição em Eventos - Implementação

## 📝 Resumo

Foi implementado um sistema completo de inscrição em eventos com:
- ✅ Campo de data para eventos únicos
- ✅ Cálculo automático da próxima data para eventos recorrentes
- ✅ Modal de inscrição com termos e condições
- ✅ Validações e feedback visual
- ✅ Utilitários para manipulação de datas

## 🗄️ IMPORTANTE: Atualizar Banco de Dados

Execute este SQL no Supabase **ANTES** de testar a aplicação:

```sql
-- Adicionar coluna de data para eventos únicos
ALTER TABLE events
ADD COLUMN IF NOT EXISTS data_evento DATE;

-- Adicionar comentário na coluna
COMMENT ON COLUMN events.data_evento IS 'Data específica para eventos únicos (formato YYYY-MM-DD). NULL para eventos recorrentes.';

-- Adicionar constraint para garantir que eventos únicos tenham data
-- e eventos semanais tenham dia da semana
ALTER TABLE events
ADD CONSTRAINT check_event_date_or_weekday 
CHECK (
  (recorrencia = 'unico' AND data_evento IS NOT NULL) OR
  (recorrencia = 'semanal' AND dia_semana IS NOT NULL)
);
```

## 📁 Arquivos Criados

### 1. `/lib/dateUtils.ts`
Utilitários para manipulação de datas:
- `calcularProximaData()` - Calcula próxima ocorrência de evento semanal
- `obterDataEvento()` - Retorna data do evento (única ou calculada)
- `formatarData()` - Formato: "15 de Janeiro de 2025"
- `formatarDataCurta()` - Formato: "15/01/2025"
- `obterNomeDiaSemana()` - Nome do dia da semana
- `eventoPassou()` - Verifica se evento já ocorreu
- `diasAteEvento()` - Calcula quantos dias faltam
- `obterMensagemProximidade()` - Mensagem amigável ("Hoje!", "Amanhã", etc.)

### 2. `/app/components/EventRegistrationModal.tsx`
Modal completo de inscrição com:
- Exibição de todas as informações do evento
- Data formatada (única ou próxima ocorrência)
- Contador de proximidade ("Em X dias", "Amanhã", etc.)
- Termos e condições detalhados
- Checkbox de aceite obrigatório
- Botões de confirmar/cancelar
- Estados de loading e erro
- Design responsivo com gradientes

### 3. `/supabase/add-event-date.sql`
Script SQL para adicionar o campo de data

## 🔧 Arquivos Modificados

### `/types/database.types.ts`
- Adicionado campo `data_evento: string | null` na interface Event

### `/app/components/CreateEventModal.tsx`
- Adicionado campo `data_evento` no formData
- Novo input de data (type="date") para eventos únicos
- Validação: eventos únicos exigem data
- Campo aparece condicionalmente baseado na recorrência
- Data mínima configurada para hoje (não permite datas passadas)

## 🎯 Como Funciona

### Eventos Únicos
1. Usuário seleciona "Evento Único"
2. Campo de data aparece automaticamente
3. Deve escolher uma data futura
4. Data é salva no banco: `data_evento`

### Eventos Recorrentes (Semanais)
1. Usuário seleciona "Evento Semanal"
2. Campo de dia da semana aparece
3. `data_evento` fica NULL no banco
4. Sistema calcula próxima ocorrência automaticamente

## 📊 Integração com Clima

A previsão do tempo agora pode usar a data correta:

```typescript
import { obterDataEvento } from '@/lib/dateUtils';

const dataEvento = obterDataEvento(event);
if (dataEvento && event.latitude && event.longitude) {
  // Buscar previsão para essa data específica
}
```

## 🎨 Modal de Inscrição - Features

### Informações Exibidas:
- ⚽ Modalidade (Campo/Salão/Society)
- 📅 Data do evento (formatada)
- 🕐 Horário (início e fim)
- 📍 Local
- 👥 Número máximo de participantes
- 💰 Valor por pessoa

### Termos e Condições:
1. Confirmação de presença
2. Informações de pagamento
3. Política de cancelamento
4. Pontualidade
5. Equipamentos necessários
6. Fair Play
7. Responsabilidade
8. Nota especial para eventos recorrentes

### Estados Visuais:
- ✅ Gradiente verde quando aceita termos
- 🔄 Loading spinner durante inscrição
- ❌ Mensagens de erro em vermelho
- ♿ Botões desabilitados quando necessário

## 🚀 Próximos Passos (Pendentes)

### 1. Adicionar Botão de Inscrição nos Cards
Modificar os cards de eventos para incluir:
```tsx
<button onClick={() => handleInscricao(event)}>
  Inscrever-se
</button>
```

### 2. Integrar com Tabela de Participantes
Criar a lógica de inscrição que salva em `event_participants`:
```typescript
const handleConfirmarInscricao = async () => {
  await supabase
    .from('event_participants')
    .insert({
      event_id: event.id,
      user_id: user.id,
      status: 'confirmado',
      payment_status: 'pendente'
    });
};
```

### 3. Mostrar Status de Inscrição
- Verificar se usuário já está inscrito
- Mostrar botão "Cancelar Inscrição" se já inscrito
- Badge indicando "Você está inscrito"

### 4. Previsão do Tempo com Data Específica
Atualizar `WeatherWidget` para:
- Receber a data do evento como prop
- Buscar previsão para aquela data (se disponível)
- Mostrar aviso se for muito longe (API só tem 5-7 dias)

### 5. Contador de Vagas Disponíveis
Exibir nos cards:
```
👥 15/22 vagas preenchidas
```

## 📱 Interface do Usuário

### Criar Evento:
```
Recorrência: [Evento Único ▼]
Data do Evento: [__|__|2025]  ← Aparece aqui
Horário: [__:__] - [__:__]
```

### Inscrever-se:
```
┌────────────────────────────────┐
│ 🎯 Inscrever-se no Evento     │
├────────────────────────────────┤
│  Pelada de Sábado              │
│  📅 15 de Novembro de 2025     │
│      Em 3 dias                 │
│  🕐 14:00 - 16:00             │
│  💰 R$ 20,00                   │
├────────────────────────────────┤
│  📋 Termos e Condições         │
│  [scroll area com termos]      │
├────────────────────────────────┤
│  ☐ Li e aceito os termos       │
├────────────────────────────────┤
│  [Cancelar]  [Confirmar] ✅    │
└────────────────────────────────┘
```

## 🐛 Troubleshooting

### Erro: "Could not find the 'data_evento' column"
- Execute o script SQL no Supabase primeiro

### Validação falha ao criar evento único
- Certifique-se de selecionar uma data
- Data não pode ser no passado

### Próxima data calculada errada
- Verifique o `dia_semana` (0=Domingo, 6=Sábado)
- Confirme que o timezone está correto

## ✨ Melhorias Futuras

1. **Lembretes automáticos** via email/push 24h antes do evento
2. **Lista de espera** quando evento estiver cheio
3. **Check-in digital** no dia do evento
4. **Avaliação** de eventos passados
5. **Compartilhamento** de eventos via link
6. **Grupos privados** para eventos recorrentes
7. **Estatísticas** de participação do usuário
