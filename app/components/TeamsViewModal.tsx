"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface TeamsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationData: {
    event_id: string;
    event_date: string;
    player_team: {
      teamNumber: number;
      teamName: string;
      teamColor: string;
    };
    all_teams: Array<{
      number: number;
      name: string;
      playersCount: number;
    }>;
    event_title: string;
    event_time: string;
    event_location: string | null;
  };
}

interface TeamDetails {
  id: string;
  team_number: number;
  team_name: string;
  team_color: string;
  players: Array<{
    id: string;
    player_name: string;
    player_position: string;
    player_score: number;
    player_order: number;
  }>;
}

const TEAM_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  'bg-red-500': { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-900' },
  'bg-blue-500': { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-900' },
  'bg-green-500': { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-900' },
  'bg-yellow-500': { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-900' },
  'bg-purple-500': { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-900' },
  'bg-orange-500': { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-900' },
  'bg-pink-500': { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-900' },
  'bg-cyan-500': { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-cyan-900' },
};

export default function TeamsViewModal({
  isOpen,
  onClose,
  notificationData,
}: TeamsViewModalProps) {
  const [teams, setTeams] = useState<TeamDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTeams();
      // Bloquear scroll do body
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar scroll do body
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, notificationData.event_id, notificationData.event_date]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      // Buscar times
      const { data: teamsData, error: teamsError } = await (supabase as any)
        .from('game_day_teams')
        .select('*')
        .eq('event_id', notificationData.event_id)
        .eq('event_date', notificationData.event_date)
        .order('team_number');

      if (teamsError) throw teamsError;

      // Buscar jogadores de cada time
      const teamsWithPlayers = await Promise.all(
        teamsData.map(async (team: any) => {
          const { data: players, error: playersError } = await (supabase as any)
            .from('game_day_team_players')
            .select(`
              *,
              participant:event_participants(
                user_id
              )
            `)
            .eq('team_id', team.id)
            .order('player_order');

          if (playersError) throw playersError;

          // Buscar perfis dos jogadores
          const playersWithProfiles = await Promise.all(
            players.map(async (p: any) => {
              const { data: profile } = await (supabase as any)
                .from('profiles')
                .select('nome, posicao')
                .eq('id', p.participant.user_id)
                .single();

              return {
                id: p.id,
                player_name: profile?.nome || 'Jogador',
                player_position: profile?.posicao || 'Sem posição',
                player_score: p.player_score,
                player_order: p.player_order,
              };
            })
          );

          return {
            ...team,
            players: playersWithProfiles,
          };
        })
      );

      setTeams(teamsWithPlayers);
    } catch (error) {
      console.error('Erro ao carregar times:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header com botão fechar */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            Times Sorteados
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto flex-1 p-6 md:p-8">
        {/* Informações do Evento */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-4 mb-6 border border-blue-200 dark:border-gray-700">
          <div className="space-y-1 text-gray-700 dark:text-gray-300">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{notificationData.event_title}</p>
            <p className="text-sm">📅 {formatDate(notificationData.event_date)}</p>
            <p className="text-sm">🕐 {notificationData.event_time}</p>
            {notificationData.event_location && (
              <p className="text-sm">📍 {notificationData.event_location}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* SEU TIME - Destaque */}
            {teams
              .filter((team) => team.team_number === notificationData.player_team.teamNumber)
              .map((team) => {
                const teamColor = TEAM_COLOR_MAP[team.team_color] || TEAM_COLOR_MAP['bg-blue-500'];
                const teamAverage = team.players.length > 0
                  ? (team.players.reduce((sum, p) => sum + p.player_score, 0) / team.players.length).toFixed(2)
                  : '0.00';

                return (
                  <div key={team.id} className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1 flex-1 bg-gradient-to-r from-green-500 to-blue-500 rounded"></div>
                      <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                        ⚽ SEU TIME E COMPANHEIROS
                      </h3>
                      <div className="h-1 flex-1 bg-gradient-to-r from-blue-500 to-green-500 rounded"></div>
                    </div>
                    
                    <div className="rounded-xl border-4 border-green-500 overflow-hidden shadow-2xl ring-4 ring-green-200">
                      {/* Header do Time */}
                      <div className={`${teamColor.bg} p-5 text-white relative`}>
                        <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-sm font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                          ★ VOCÊ ESTÁ AQUI
                        </div>
                        <h4 className="text-3xl font-bold mb-2">
                          Time {team.team_name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm opacity-90">
                          <span className="bg-white/20 px-3 py-1 rounded-full">
                            #{team.team_number}
                          </span>
                          <span>
                            👥 {team.players.length} jogador(es)
                          </span>
                          <span>
                            📊 Média: {teamAverage}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Jogadores */}
                      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-5 space-y-3">
                        {team.players.map((player, idx) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-bold text-lg text-gray-900 dark:text-white">
                                  {player.player_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                  📍 {player.player_position}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                                {player.player_score.toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                habilidade
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* OUTROS TIMES */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 flex-1 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  🎮 OUTROS TIMES
                </h3>
                <div className="h-1 flex-1 bg-gray-300 dark:bg-gray-700 rounded"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {teams
                  .filter((team) => team.team_number !== notificationData.player_team.teamNumber)
                  .map((team) => {
                    const teamColor = TEAM_COLOR_MAP[team.team_color] || TEAM_COLOR_MAP['bg-blue-500'];
                    const teamAverage = team.players.length > 0
                      ? (team.players.reduce((sum, p) => sum + p.player_score, 0) / team.players.length).toFixed(2)
                      : '0.00';

                    return (
                      <div
                        key={team.id}
                        className={`rounded-xl border-3 ${teamColor.border} overflow-hidden shadow-lg hover:shadow-xl transition-shadow`}
                      >
                        {/* Header do Time */}
                        <div className={`${teamColor.bg} p-4 text-white`}>
                          <h4 className="text-xl font-bold flex items-center justify-between">
                            <span>Time {team.team_name}</span>
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                              #{team.team_number}
                            </span>
                          </h4>
                          <p className="text-sm mt-1 opacity-90">
                            {team.players.length} jogador(es) • Média: {teamAverage}
                          </p>
                        </div>

                        {/* Lista de Jogadores */}
                        <div className="bg-white dark:bg-gray-800 p-3 space-y-2">
                          {team.players.map((player, idx) => (
                            <div
                              key={player.id}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-400 w-6">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                    {player.player_name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                    {player.player_position}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900 dark:text-white">
                                  {player.player_score.toFixed(1)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
