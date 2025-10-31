# 💰 Sistema de Pagamento PIX - Guia Completo

## 📋 Visão Geral

Sistema de pagamento via PIX com aprovação manual para eventos. Permite que jogadores paguem via QR Code PIX ou enviem comprovante de pagamento alternativo (dinheiro, transferência), e que admins do evento aprovem os pagamentos.

---

## 🎯 Fluxo Completo do Sistema

### Para o Jogador:

```
1. Inscrição no Evento
   - Clica em "Inscrever-se"
   - Status inicial: participant.status = "pendente"
   - Precisa pagar para ser confirmado

2. Pagamento
   - Clica em "Pagar Evento"
   - Modal abre com 2 opções:
     
     A) Pagar via PIX:
        → Mostra QR Code gerado
        → Mostra código PIX copia-e-cola
        → Jogador paga no app do banco
        → Volta e clica "Já paguei"
        → Faz upload do comprovante
        → Status: "processando"
     
     B) Já paguei (outro método):
        → Faz upload do comprovante direto
        → Status: "processando"

3. Aguarda Aprovação
   - Admin recebe notificação
   - Status permanece "processando"
   - Ainda não pode confirmar presença

4. Pagamento Aprovado
   - Admin aprova o comprovante
   - Status muda para "confirmado"
   - Agora pode confirmar presença no evento

5. Confirmação de Presença
   - Botões habilitados: "Vou" / "Talvez" / "Não Vou"
   - Apenas se pagamento estiver em dia
```

### Para o Admin:

```
1. Configurar PIX
   - Vai em "Perfil"
   - Adiciona sua chave PIX
   - Pode ser: CPF, Email, Telefone, ou Chave Aleatória

2. Criar Evento
   - Define valor_por_pessoa
   - Define se requer_pagamento = true
   - Sistema usará sua chave PIX

3. Gerenciar Pagamentos (Caixinha)
   - Acessa aba "Pagamentos" no evento
   - Vê dashboard com:
     ✓ Total arrecadado
     ✓ Total esperado
     ✓ Pendentes de aprovação
   
4. Aprovar Comprovantes
   - Lista de pagamentos "processando"
   - Clica no comprovante para ver
   - Botões: "Aprovar" ou "Rejeitar"
   - Se aprovar → participante confirmado
   - Se rejeitar → volta para "pendente"
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `profiles`
```sql
profiles:
  ...
  chave_pix: VARCHAR(255) -- Nova coluna
```

### Tabela: `event_participants`
```sql
event_participants:
  id: UUID
  event_id: UUID
  user_id: UUID
  status: VARCHAR -- pendente, confirmado, cancelado
  presence_status: VARCHAR -- confirmado, talvez, nao_vou (NOVO)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
```

### Tabela: `event_payments`
```sql
event_payments:
  id: UUID
  participant_id: UUID
  event_id: UUID
  user_id: UUID
  valor: DECIMAL
  status: VARCHAR -- pendente, processando, confirmado, cancelado, reembolsado
  metodo_pagamento: VARCHAR -- pix, dinheiro, transferencia, cartao
  comprovante_url: TEXT -- NOVO: URL do comprovante no Supabase Storage
  data_pagamento: TIMESTAMP
  data_validade: DATE
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
```

### Supabase Storage: `payment-receipts`
```
Bucket privado para armazenar comprovantes
Estrutura de pastas:
/payment-receipts
  /{event_id}
    /{user_id}
      /comprovante-{timestamp}.jpg
```

---

## 🔐 Segurança (RLS Policies)

### Storage Bucket `payment-receipts`

**Upload (Usuários):**
```sql
-- Usuário pode fazer upload apenas em sua própria pasta
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Download (Usuários e Admins):**
```sql
-- Usuário pode ver próprios comprovantes
-- Criador do evento pode ver comprovantes dos participantes
CREATE POLICY "Users and event creators can view receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts'
  AND (
    -- Próprio usuário
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Criador do evento
    EXISTS (
      SELECT 1 FROM event_payments ep
      JOIN events e ON e.id = ep.event_id
      WHERE (storage.foldername(name))[1] = ep.event_id::text
      AND e.criador_id = auth.uid()
    )
  )
);
```

---

## 💻 Componentes a Criar

### 1. `PaymentModal.tsx`
Modal principal de pagamento com 2 abas:

**Aba 1: Pagar via PIX**
- Gera QR Code PIX
- Mostra código copia-e-cola
- Botão "Já paguei"
- Upload de comprovante

**Aba 2: Já paguei (outro método)**
- Dropdown para selecionar método (dinheiro, transferência, etc)
- Upload de comprovante
- Botão "Enviar comprovante"

**Props:**
```typescript
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  participant: EventParticipant;
  onPaymentSubmitted: () => void;
}
```

### 2. `PIXQRCode.tsx`
Componente que gera QR Code PIX:

**Bibliotecas necessárias:**
```bash
npm install qrcode.react
npm install pix-utils
```

**Funcionalidade:**
- Recebe: chave PIX, valor, nome/descrição
- Gera: código PIX (formato EMV)
- Renderiza: QR Code + texto copia-e-cola

**Props:**
```typescript
interface PIXQRCodeProps {
  chavePix: string;
  valor: number;
  nomeRecebedor: string;
  cidade?: string;
  identificador?: string;
}
```

### 3. `ParticipantsListModal.tsx`
Modal que mostra lista de participantes:

**Seções:**
1. **Resumo:**
   - Total inscritos
   - Confirmados (pagamento OK)
   - Pendentes de pagamento
   - Vão comparecer

2. **Lista de Participantes:**
   - Nome
   - Status de pagamento (badge colorido)
   - Status de presença (badge)
   - Data de inscrição
   - Ações (se for admin)

**Props:**
```typescript
interface ParticipantsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  isAdmin: boolean;
}
```

### 4. `EventPaymentsPanel.tsx`
Painel de administração de pagamentos (Caixinha):

**Dashboard:**
- 💰 Total Arrecadado: R$ X
- 📊 Total Esperado: R$ Y
- ⏳ Pendentes: Z pagamentos
- ✅ Confirmados: W pagamentos

**Lista de Pagamentos:**
Tabela com:
- Nome do jogador
- Valor
- Método
- Status
- Comprovante (link para ver)
- Ações: Aprovar / Rejeitar (se processando)

**Props:**
```typescript
interface EventPaymentsPanelProps {
  event: Event;
  isAdmin: boolean;
}
```

### 5. `PresenceButtons.tsx`
Botões de confirmação de presença:

**Estados:**
- ✅ Vou (verde)
- 🤔 Talvez (amarelo)
- ❌ Não Vou (vermelho)

**Regras:**
- Apenas habilitado se pagamento em dia
- Mostra tooltip se desabilitado: "Pagamento pendente"

**Props:**
```typescript
interface PresenceButtonsProps {
  participant: EventParticipant;
  payment: EventPayment | null;
  onStatusChange: (status: 'confirmado' | 'talvez' | 'nao_vou') => void;
}
```

---

## 🔨 Funções Utilitárias

### 1. `generatePixCode.ts`
```typescript
/**
 * Gera código PIX EMV para pagamento
 */
export function generatePixCode(params: {
  chavePix: string;
  valor: number;
  nomeRecebedor: string;
  cidade: string;
  identificador: string;
}): string {
  // Implementação do formato EMV PIX
  // Usa biblioteca pix-utils
}
```

### 2. `checkPaymentStatus.ts`
```typescript
/**
 * Verifica se usuário está com pagamento em dia
 */
export async function checkPaymentStatus(
  userId: string,
  eventId: string
): Promise<{
  isValid: boolean;
  payment: EventPayment | null;
  message: string;
}> {
  // Busca último pagamento
  // Verifica se status = confirmado
  // Verifica se data_validade > hoje
  // Retorna resultado
}
```

### 3. `uploadReceipt.ts`
```typescript
/**
 * Faz upload do comprovante para o Supabase Storage
 */
export async function uploadReceipt(
  file: File,
  eventId: string,
  userId: string
): Promise<string> {
  // Path: payment-receipts/{eventId}/{userId}/comprovante-{timestamp}.jpg
  // Upload para Supabase Storage
  // Retorna URL pública/assinada
}
```

### 4. `approvePayment.ts`
```typescript
/**
 * Aprova pagamento e atualiza status do participante
 */
export async function approvePayment(
  paymentId: string
): Promise<void> {
  // 1. Atualiza payment.status = 'confirmado'
  // 2. Atualiza payment.data_pagamento = NOW()
  // 3. Trigger automático atualiza participant.status
  // 4. Envia notificação ao usuário (opcional)
}
```

---

## 📱 UX/UI - Experiência do Usuário

### Para o Jogador:

**1. Card do Evento (antes de pagar):**
```
┌────────────────────────────────┐
│ Racha Sábado à Tarde           │
│ ⚽ Campo - 22 vagas             │
│ 📍 Campo do Parque             │
│ 💰 R$ 30,00 por pessoa         │
│                                │
│ Status: ⏳ Pagamento Pendente  │
│                                │
│ [  💳 Pagar Agora  ]          │
└────────────────────────────────┘
```

**2. Modal de Pagamento:**
```
┌──────────────────────────────────┐
│ 💳 Pagamento do Evento           │
│ Racha Sábado à Tarde             │
│ Valor: R$ 30,00                  │
├──────────────────────────────────┤
│                                  │
│ 📱 Pagar via PIX  |  📎 Já Paguei│
│                                  │
│ [QR Code aqui]                   │
│                                  │
│ Chave PIX (copiar):              │
│ [11987654321] [📋 Copiar]        │
│                                  │
│ 1. Abra o app do seu banco       │
│ 2. Escaneie o QR Code ou copie  │
│ 3. Confirme o pagamento          │
│ 4. Volte aqui e clique:          │
│                                  │
│ [  ✅ Já Paguei  ]              │
│                                  │
│ Upload do Comprovante:           │
│ [📁 Escolher arquivo]           │
│                                  │
│ [  Enviar Comprovante  ]        │
└──────────────────────────────────┘
```

**3. Card do Evento (após pagar - aguardando):**
```
┌────────────────────────────────┐
│ Racha Sábado à Tarde           │
│                                │
│ Status: ⏳ Pagamento em Análise│
│                                │
│ Seu comprovante foi enviado    │
│ e está sendo analisado pelo    │
│ organizador do evento.         │
│                                │
│ [  Ver Comprovante  ]         │
└────────────────────────────────┘
```

**4. Card do Evento (pagamento aprovado):**
```
┌────────────────────────────────┐
│ Racha Sábado à Tarde           │
│                                │
│ Status: ✅ Confirmado          │
│                                │
│ Você vai?                      │
│ ┌─────┐ ┌──────┐ ┌─────────┐ │
│ │ ✅  │ │ 🤔   │ │   ❌    │ │
│ │ Vou │ │Talvez│ │ Não Vou │ │
│ └─────┘ └──────┘ └─────────┘ │
│                                │
│ [  Ver Participantes (12)  ]  │
└────────────────────────────────┘
```

### Para o Admin:

**1. Card do Evento (visão admin):**
```
┌────────────────────────────────┐
│ Meu Racha Sábado               │
│ ⚽ Campo - 22 vagas             │
│                                │
│ 💰 Caixinha:                   │
│ Arrecadado: R$ 360,00          │
│ Esperado: R$ 660,00           │
│                                │
│ 📊 Participantes:              │
│ • 12 Confirmados (✅)         │
│ • 3 Pendentes (⏳)            │
│ • 8 Vão comparecer (✅)       │
│                                │
│ [  💰 Ver Caixinha  ]         │
│ [  👥 Ver Participantes  ]    │
└────────────────────────────────┘
```

**2. Painel da Caixinha:**
```
┌──────────────────────────────────────┐
│ 💰 Caixinha do Evento                │
├──────────────────────────────────────┤
│                                      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │R$ 360,00│ │R$ 660,00│ │  3 ⏳   ││
│ │Recebido │ │Esperado │ │Pendentes││
│ └─────────┘ └─────────┘ └─────────┘│
│                                      │
│ ⏳ Pagamentos Pendentes de Aprovação:│
│                                      │
│ ┌────────────────────────────────┐ │
│ │ João Silva - R$ 30,00          │ │
│ │ Método: PIX                    │ │
│ │ [📷 Ver Comprovante]          │ │
│ │ [✅ Aprovar] [❌ Rejeitar]    │ │
│ └────────────────────────────────┘ │
│                                      │
│ ✅ Pagamentos Confirmados:           │
│ [Lista de 12 pagamentos...]         │
│                                      │
└──────────────────────────────────────┘
```

---

## 🚀 Ordem de Implementação

### Fase 1: Base (Começar Aqui!)
1. ✅ Executar SQL de alterações (`add-payment-features.sql`)
2. ✅ Criar bucket no Supabase Storage
3. ✅ Atualizar `database.types.ts`
4. ✅ Adicionar campo de chave PIX no perfil do usuário

### Fase 2: Componentes de Pagamento
5. Instalar bibliotecas: `qrcode.react`, `pix-utils`
6. Criar `PIXQRCode.tsx`
7. Criar `PaymentModal.tsx`
8. Criar funções: `generatePixCode`, `uploadReceipt`

### Fase 3: Lista de Participantes
9. Criar `ParticipantsListModal.tsx`
10. Adicionar botão "Ver Participantes" nos cards de evento
11. Mostrar status de pagamento e presença

### Fase 4: Confirmação de Presença
12. Criar `PresenceButtons.tsx`
13. Integrar nos cards de evento (após pagamento aprovado)
14. Criar função `checkPaymentStatus`

### Fase 5: Painel do Admin
15. Criar `EventPaymentsPanel.tsx`
16. Criar função `approvePayment`
17. Adicionar botão "Ver Caixinha" para admins
18. Implementar aprovação/rejeição de comprovantes

### Fase 6: Melhorias
19. Notificações de pagamento aprovado
20. Email quando pagamento está próximo do vencimento
21. Dashboard de estatísticas

---

## ⚠️ Pontos de Atenção

### Segurança:
- ✅ Comprovantes ficam em bucket privado
- ✅ RLS garante que apenas dono e admin vejam
- ✅ Upload limitado a formatos de imagem
- ✅ Tamanho máximo de arquivo definido

### Performance:
- Cache de QR Codes gerados
- Lazy loading de comprovantes
- Paginação na lista de pagamentos

### UX:
- Loading states em todos os uploads
- Mensagens de erro claras
- Confirmação antes de aprovar/rejeitar
- Preview de comprovante antes de enviar

---

## 📚 Próximos Passos

Agora que você entende todo o fluxo, vamos começar a implementar!

**Você está pronto para começar?** 

Posso começar pelo mais simples:
1. Adicionar campo de chave PIX no perfil
2. Atualizar os tipos
3. Criar o componente de QR Code PIX

Ou prefere que eu explique mais alguma parte antes?
