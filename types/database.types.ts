export type UserRole = 'admin' | 'usuario' | 'criador_evento';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type TipoFutebol = 'campo' | 'salao' | 'society';
export type Recorrencia = 'unico' | 'semanal';
export type StatusEvento = 'ativo' | 'cancelado' | 'finalizado';

export interface Event {
  id: string;
  titulo: string;
  tipo_futebol: TipoFutebol;
  max_participantes: number;
  recorrencia: Recorrencia;
  dia_semana: number | null;
  data_evento: string | null; // Data específica para eventos únicos (YYYY-MM-DD)
  horario_inicio: string;
  horario_fim: string;
  valor_por_pessoa: number;
  local: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
  criador_id: string;
  status: StatusEvento;
  sazonalidade_meses: number | null; // 1, 3, 6, 12 meses ou null
  data_limite_pagamento: string | null; // Data limite para pagamento (YYYY-MM-DD)
  requer_pagamento: boolean;
  created_at: string;
  updated_at: string;
}

export type ParticipantStatus = 'confirmado' | 'cancelado' | 'pendente';

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipantStatus;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pendente' | 'processando' | 'confirmado' | 'cancelado' | 'reembolsado';
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'transferencia';

export interface EventPayment {
  id: string;
  participant_id: string;
  event_id: string;
  user_id: string;
  valor: number;
  status: PaymentStatus;
  metodo_pagamento: PaymentMethod | null;
  data_pagamento: string | null;
  data_validade: string | null; // Data até quando o pagamento é válido
  data_vencimento: string | null;
  referencia_externa: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'created_at' | 'updated_at'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'status' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id' | 'criador_id' | 'created_at' | 'updated_at'>>;
      };
      event_participants: {
        Row: EventParticipant;
        Insert: Omit<EventParticipant, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<EventParticipant, 'id' | 'event_id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      event_payments: {
        Row: EventPayment;
        Insert: Omit<EventPayment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<EventPayment, 'id' | 'participant_id' | 'event_id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
