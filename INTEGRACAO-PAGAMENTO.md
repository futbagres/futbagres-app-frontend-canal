# 🎯 Guia de Integração - Sistema de Pagamento PIX

## ✅ Status: Todos os componentes criados!

### 📦 Componentes Criados

1. ✅ **PIXQRCode** - Gera QR Code e código copia-e-cola
2. ✅ **PaymentModal** - Modal de pagamento (PIX + Upload manual)
3. ✅ **PresenceButtons** - Botões Vou/Talvez/Não Vou
4. ✅ **ParticipantsListModal** - Lista de participantes com status
5. ✅ **EventPaymentsPanel** - Painel admin (Caixinha)

### 🔧 Funções Utilitárias

1. ✅ **pix-utils.ts** - Geração de código PIX EMV
2. ✅ **receipt-upload.ts** - Upload de comprovantes
3. ✅ **payment-utils.ts** - Validação e aprovação de pagamentos

---

## 🚀 Como Integrar nos Cards de Evento

### 1. Importar os Componentes

```typescript
import PaymentModal from "@/app/components/PaymentModal";
import PresenceButtons from "@/app/components/PresenceButtons";
import ParticipantsListModal from "@/app/components/ParticipantsListModal";
import EventPaymentsPanel from "@/app/components/EventPaymentsPanel";
```

### 2. Adicionar Estados no Componente

```typescript
const [paymentModalOpen, setPaymentModalOpen] = useState(false);
const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
const [paymentsAdminOpen, setPaymentsAdminOpen] = useState(false);
const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
```

### 3. Buscar Dados Necessários

Adicione estas queries quando carregar os eventos:

```typescript
// Buscar participação do usuário
const { data: myParticipation } = await supabase
  .from("event_participants")
  .select("*")
  .eq("event_id", event.id)
  .eq("user_id", userId)
  .single();

// Buscar perfil do criador (para chave PIX)
const { data: creatorProfile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", event.criador_id)
  .single();
```

### 4. Adicionar Botões no Card do Evento

#### Para Participantes:

```tsx
{/* Botão de Pagamento (se status pendente) */}
{myParticipation?.status === "pendente" && event.requer_pagamento && (
  <button
    onClick={() => {
      setSelectedEvent(event);
      setPaymentModalOpen(true);
    }}
    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
  >
    💳 Pagar Evento (R$ {event.valor_por_pessoa.toFixed(2)})
  </button>
)}

{/* Botões de Presença (se pagamento confirmado) */}
{myParticipation?.status === "confirmado" && (
  <PresenceButtons
    eventId={event.id}
    userId={userId}
    participant={myParticipation}
    onStatusChange={() => {
      // Recarregar dados se necessário
    }}
  />
)}

{/* Botão Ver Participantes */}
<button
  onClick={() => {
    setSelectedEvent(event);
    setParticipantsModalOpen(true);
  }}
  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
>
  👥 Ver Participantes ({totalParticipantes})
</button>
```

#### Para Criadores do Evento:

```tsx
{/* Botão Caixinha (apenas para criador) */}
{event.criador_id === userId && (
  <button
    onClick={() => {
      setSelectedEvent(event);
      setPaymentsAdminOpen(true);
    }}
    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
  >
    💰 Ver Caixinha
  </button>
)}
```

### 5. Adicionar os Modals no JSX

No final do componente, adicione:

```tsx
{/* Modal de Pagamento */}
{paymentModalOpen && selectedEvent && myParticipation && creatorProfile && (
  <PaymentModal
    isOpen={paymentModalOpen}
    onClose={() => setPaymentModalOpen(false)}
    event={selectedEvent}
    participant={myParticipation}
    criadorProfile={creatorProfile}
    onPaymentSubmitted={() => {
      // Recarregar dados
      loadEvents();
    }}
  />
)}

{/* Modal de Participantes */}
{participantsModalOpen && selectedEvent && (
  <ParticipantsListModal
    isOpen={participantsModalOpen}
    onClose={() => setParticipantsModalOpen(false)}
    eventId={selectedEvent.id}
    isAdmin={selectedEvent.criador_id === userId}
  />
)}

{/* Painel Admin de Pagamentos */}
{paymentsAdminOpen && selectedEvent && (
  <EventPaymentsPanel
    isOpen={paymentsAdminOpen}
    onClose={() => setPaymentsAdminOpen(false)}
    eventId={selectedEvent.id}
    onPaymentUpdated={() => {
      // Recarregar dados
      loadEvents();
    }}
  />
)}
```

---

## 🎨 Estados Visuais dos Botões

### Status do Participante:
- **Pendente** → Mostrar botão "💳 Pagar Evento"
- **Processando** → Mostrar "⏳ Pagamento em Análise"
- **Confirmado** → Mostrar botões de presença (Vou/Talvez/Não Vou)

### Badges de Status:
- **Pagamento Pendente** → Badge cinza
- **Pagamento em Análise** → Badge amarelo
- **Pagamento Confirmado** → Badge verde
- **Pagamento Cancelado** → Badge vermelho

---

## 📋 Checklist de Configuração no Supabase

### 1. Bucket de Storage ✅
```
1. Acesse Supabase Dashboard → Storage
2. Clique em "New Bucket"
3. Nome: payment-receipts
4. Public: NÃO (deixar privado)
5. Criar
```

### 2. Executar SQL de Políticas RLS ✅
```
1. Acesse Supabase Dashboard → SQL Editor
2. Copie o conteúdo de: supabase/storage-policies.sql
3. Execute o SQL
4. Verifique se as 4 políticas foram criadas
```

### 3. Testar Upload ✅
```
1. Faça login como usuário
2. Inscreva-se em um evento pago
3. Clique em "Pagar Evento"
4. Tente fazer upload de um comprovante
5. Verifique se o arquivo aparece no Storage
```

---

## 🧪 Fluxo de Teste Completo

### Teste 1: Criar Evento Pago (Como Criador)
1. Vá em Perfil → Adicione sua chave PIX
2. Crie um evento com `requer_pagamento = true`
3. Defina `valor_por_pessoa` (ex: 30.00)
4. Publique o evento

### Teste 2: Inscrição e Pagamento (Como Participante)
1. Faça login com outra conta
2. Inscreva-se no evento
3. Clique em "Pagar Evento"
4. **Opção 1: PIX**
   - Veja o QR Code gerado
   - Copie o código PIX
   - Pague no app do banco
   - Clique "Já Paguei"
   - Faça upload do comprovante
5. **Opção 2: Manual**
   - Selecione método (dinheiro, transferência, etc)
   - Faça upload do comprovante
6. Aguarde status "Em Análise"

### Teste 3: Aprovar Pagamento (Como Criador)
1. Volte para conta do criador
2. Clique em "Ver Caixinha"
3. Veja o pagamento pendente
4. Clique em "Ver Comprovante"
5. Clique em "Aprovar"
6. Confirme a aprovação

### Teste 4: Confirmar Presença (Como Participante)
1. Volte para conta do participante
2. Veja que status mudou para "Confirmado"
3. Botões de presença agora estão habilitados
4. Clique em "Vou" / "Talvez" / "Não Vou"
5. Veja o badge de presença atualizar

### Teste 5: Ver Participantes (Ambos)
1. Clique em "Ver Participantes"
2. Veja estatísticas: Total, Confirmados, Pendentes, Vão Comparecer
3. Veja lista com status de pagamento e presença

---

## 🎯 Próximas Melhorias (Opcional)

1. **Notificações**
   - Email quando pagamento é aprovado
   - Push quando falta 1 dia para vencimento

2. **Dashboard Avançado**
   - Gráfico de evolução de pagamentos
   - Histórico de transações
   - Exportar relatório PDF

3. **Integração com Gateway**
   - PIX dinâmico com webhook
   - Verificação automática de pagamento
   - Geração de QR Code temporário

4. **Multi-eventos**
   - Pacote de múltiplos eventos
   - Desconto para grupo
   - Cashback para frequentes

---

## 📞 Troubleshooting

### Erro: "Bucket payment-receipts not found"
**Solução:** Criar o bucket no Supabase Dashboard → Storage

### Erro: "Policy violation" ao fazer upload
**Solução:** Executar SQL das políticas RLS em `supabase/storage-policies.sql`

### Erro: "Chave PIX não encontrada"
**Solução:** Adicionar chave PIX no perfil do criador do evento

### QR Code não aparece
**Solução:** Verificar se criador tem chave PIX cadastrada e se biblioteca qrcode.react está instalada

### Botões de presença desabilitados
**Solução:** Verificar se pagamento está com status "confirmado" e dentro da validade

---

## ✅ Sistema Completo!

Todos os componentes estão prontos para uso. Agora você pode:

1. ✅ Cadastrar chave PIX no perfil
2. ✅ Criar eventos pagos
3. ✅ Gerar QR Code PIX
4. ✅ Receber e fazer upload de comprovantes
5. ✅ Aprovar/rejeitar pagamentos
6. ✅ Confirmar presença (se pagamento OK)
7. ✅ Ver lista de participantes
8. ✅ Gerenciar caixinha do evento

**Próximo passo:** Integrar os componentes no dashboard ou página de eventos! 🚀
