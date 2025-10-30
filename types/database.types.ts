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
  horario_inicio: string;
  horario_fim: string;
  valor_por_pessoa: number;
  local: string | null;
  descricao: string | null;
  criador_id: string;
  status: StatusEvento;
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
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id' | 'criador_id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
