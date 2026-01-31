export type UserRole = 'admin' | 'usuario' | 'criador_evento';
export type PlayerPosition = 'goleiro' | 'zagueiro' | 'lateral' | 'volante' | 'meia' | 'atacante';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  avatar_url: string | null;
  // Dados do jogador
  posicao: PlayerPosition | null;
  // Autoavaliação (0.5 a 5.0)
  auto_defesa: number | null;
  auto_velocidade: number | null;
  auto_passe: number | null;
  auto_chute: number | null;
  auto_drible: number | null;
  // Pagamento
  chave_pix: string | null; // CPF, email, telefone ou chave aleatória
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
export type PresenceStatus = 'confirmado' | 'talvez' | 'nao_vou';

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipantStatus;
  presence_status: PresenceStatus;
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
  comprovante_url: string | null; // URL do comprovante no Supabase Storage
  data_pagamento: string | null;
  data_validade: string | null; // Data até quando o pagamento é válido
  data_vencimento: string | null;
  referencia_externa: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// Avaliações de jogadores (BagreScore)
export interface PlayerEvaluation {
  id: string;
  event_id: string;
  avaliador_id: string;
  avaliado_id: string;
  defesa: number;
  velocidade: number;
  passe: number;
  chute: number;
  drible: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 
  | 'payment_pending' 
  | 'payment_approved' 
  | 'payment_rejected' 
  | 'event_updated' 
  | 'event_cancelled' 
  | 'participant_joined'
  | 'teams_generated'
  | 'new_follower';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameDayTeam {
  id: string;
  event_id: string;
  event_date: string;
  team_number: number;
  team_name: string;
  team_color: string;
  created_by: string;
  evaluation_type: 'auto' | 'historic';
  created_at: string;
}

export interface GameDayTeamPlayer {
  id: string;
  team_id: string;
  participant_id: string;
  player_score: number;
  player_order: number;
  created_at: string;
}

export interface Friendship {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'active' | 'blocked';
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
      player_evaluations: {
        Row: PlayerEvaluation;
        Insert: Omit<PlayerEvaluation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PlayerEvaluation, 'id' | 'event_id' | 'avaliador_id' | 'avaliado_id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Notification, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      friendships: {
        Row: Friendship;
        Insert: Omit<Friendship, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Friendship, 'id' | 'follower_id' | 'following_id' | 'created_at' | 'updated_at'>>;
      };
      game_day_teams: {
        Row: GameDayTeam;
        Insert: Omit<GameDayTeam, 'id' | 'created_at'>;
        Update: Partial<Omit<GameDayTeam, 'id' | 'event_id' | 'event_date' | 'created_by' | 'created_at'>>;
      };
      game_day_team_players: {
        Row: GameDayTeamPlayer;
        Insert: Omit<GameDayTeamPlayer, 'id' | 'created_at'>;
        Update: Partial<Omit<GameDayTeamPlayer, 'id' | 'team_id' | 'participant_id' | 'created_at'>>;
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
