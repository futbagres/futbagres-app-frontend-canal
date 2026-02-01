"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import type { Event, EventParticipant, Profile } from "@/types/database.types";

interface GameDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onTeamsGenerated?: () => void;
}

interface ParticipantWithProfile extends EventParticipant {
  profile?: Profile;
  averageScore?: number;
  evaluationCount?: number;
}

type EvaluationType = "auto" | "historic";

const TEAM_COLORS = [
  { name: "Vermelho", bg: "bg-red-500", border: "border-red-600", text: "text-red-900" },
  { name: "Azul", bg: "bg-blue-500", border: "border-blue-600", text: "text-blue-900" },
  { name: "Verde", bg: "bg-green-500", border: "border-green-600", text: "text-green-900" },
  { name: "Amarelo", bg: "bg-yellow-500", border: "border-yellow-600", text: "text-yellow-900" },
  { name: "Roxo", bg: "bg-purple-500", border: "border-purple-600", text: "text-purple-900" },
  { name: "Laranja", bg: "bg-orange-500", border: "border-orange-600", text: "text-orange-900" },
  { name: "Rosa", bg: "bg-pink-500", border: "border-pink-600", text: "text-pink-900" },
  { name: "Ciano", bg: "bg-cyan-500", border: "border-cyan-600", text: "text-cyan-900" },
];

export default function GameDayModal({
  isOpen,
  onClose,
  event,
  onTeamsGenerated,
}: GameDayModalProps) {
  const [step, setStep] = useState<"confirm" | "config" | "teams">("confirm");
  const [confirmedParticipants, setConfirmedParticipants] = useState<ParticipantWithProfile[]>([]);
  const [presentPlayers, setPresentPlayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("historic");
  const [generatedTeams, setGeneratedTeams] = useState<ParticipantWithProfile[][]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfirmedParticipants();
    }
  }, [isOpen, event.id]);

  const loadConfirmedParticipants = async () => {
    setLoading(true);
    try {
      // Buscar participantes confirmados que disseram "vou"
      const { data: participants, error } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "confirmado")
        .eq("presence_status", "confirmado");

      if (error) throw error;

      // Buscar perfis e avaliações
      const participantsWithData = await Promise.all(
        (participants || []).map(async (p: EventParticipant) => {
          // Buscar perfil
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", p.user_id)
            .single();

          // Buscar avaliações históricas
          const { data: evaluations } = await supabase
            .from("player_evaluations")
            .select("*")
            .eq("avaliado_id", p.user_id);

          let averageScore = 0;
          let evaluationCount = 0;

          if (evaluations && evaluations.length > 0) {
            // Calcular média das avaliações históricas
            const totalScore = evaluations.reduce((sum: number, ev: any) => {
              return (
                sum +
                (ev.defesa + ev.velocidade + ev.passe + ev.chute + ev.drible) / 5
              );
            }, 0);
            averageScore = totalScore / evaluations.length;
            evaluationCount = evaluations.length;
          } else if (profile) {
            // Usar autoavaliação se não houver avaliações
            const profileData = profile as any;
            const autoScores = [
              profileData.auto_defesa,
              profileData.auto_velocidade,
              profileData.auto_passe,
              profileData.auto_chute,
              profileData.auto_drible,
            ].filter((s): s is number => s !== null);

            if (autoScores.length > 0) {
              averageScore =
                autoScores.reduce((a, b) => a + b, 0) / autoScores.length;
            }
          }

          return {
            ...p,
            profile: profile || undefined,
            averageScore,
            evaluationCount,
          };
        })
      );

      setConfirmedParticipants(participantsWithData);
      // Inicialmente todos estão marcados como presentes
      setPresentPlayers(new Set(participantsWithData.map((p) => p.user_id)));
    } catch (error) {
      console.error("Erro ao carregar participantes:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePresence = (userId: string) => {
    setPresentPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleNextStep = () => {
    if (step === "confirm") {
      setStep("config");
    }
  };

  const sendTeamsNotifications = async (eventDate: string) => {
    try {
      console.log('📢 Enviando notificações dos times...');

      // Buscar todos os times gerados
      const { data: teams, error: teamsError } = await (supabase as any)
        .from('game_day_teams')
        .select('*')
        .eq('event_id', event.id)
        .eq('event_date', eventDate)
        .order('team_number');

      if (teamsError) throw teamsError;

      // Buscar todos os jogadores dos times com seus perfis
      const { data: teamPlayers, error: playersError } = await (supabase as any)
        .from('game_day_team_players')
        .select(`
          *,
          team:game_day_teams(team_number, team_name, team_color),
          participant:event_participants(user_id)
        `)
        .in('team_id', teams.map((t: any) => t.id));

      if (playersError) throw playersError;

      // Criar mapa de jogador -> time
      const playerTeamMap = new Map();
      teamPlayers.forEach((tp: any) => {
        playerTeamMap.set(tp.participant.user_id, {
          teamNumber: tp.team.team_number,
          teamName: tp.team.team_name,
          teamColor: tp.team.team_color,
        });
      });

      // Preparar resumo dos times para a notificação
      const teamsResume = teams.map((team: any) => {
        const players = teamPlayers.filter((tp: any) => tp.team_id === team.id);
        return {
          number: team.team_number,
          name: team.team_name,
          playersCount: players.length,
        };
      });

      // Criar notificações para cada participante presente
      const notifications = Array.from(presentPlayers).map((userId) => {
        const playerTeam = playerTeamMap.get(userId);
        
        if (!playerTeam) {
          console.warn(`Jogador ${userId} não está em nenhum time`);
          return null;
        }

        return {
          user_id: userId,
          type: 'teams_generated',
          title: `🏆 Times Sorteados - ${event.titulo}`,
          message: `Você está no Time ${playerTeam.teamName}! ${teams.length} times foram formados para o jogo.`,
          data: {
            event_id: event.id,
            event_date: eventDate,
            player_team: playerTeam,
            all_teams: teamsResume,
            event_title: event.titulo,
            event_time: event.horario_inicio,
            event_location: event.local,
          },
          read: false,
        };
      }).filter((n) => n !== null);

      // Inserir notificações no banco
      if (notifications.length > 0) {
        // @ts-ignore
        const { error: notifError } = await (supabase as any)
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Erro ao enviar notificações:', notifError);
        } else {
          console.log(`✅ ${notifications.length} notificações enviadas com sucesso!`);
        }
      }
    } catch (error) {
      console.error('Erro ao enviar notificações dos times:', error);
      // Não bloqueia o fluxo principal
    }
  };

  const calculatePlayerScore = (participant: ParticipantWithProfile): number => {
    if (evaluationType === "historic" && participant.evaluationCount! > 0) {
      // Usar média histórica
      return participant.averageScore || 0;
    } else if (participant.profile) {
      // Usar autoavaliação
      const profileData = participant.profile as any;
      const autoScores = [
        profileData.auto_defesa,
        profileData.auto_velocidade,
        profileData.auto_passe,
        profileData.auto_chute,
        profileData.auto_drible,
      ].filter((s) => s !== null) as number[];

      if (autoScores.length > 0) {
        return autoScores.reduce((a, b) => a + b, 0) / autoScores.length;
      }
    }
    return 2.5; // Score padrão médio
  };

  const generateBalancedTeams = () => {
    setGenerating(true);

    try {
      // Filtrar apenas jogadores presentes
      const presentPlayersList = confirmedParticipants.filter((p) =>
        presentPlayers.has(p.user_id)
      );

      if (presentPlayersList.length === 0) {
        alert("Nenhum jogador presente!");
        return;
      }

      // Calcular scores
      const playersWithScores = presentPlayersList.map((p) => ({
        ...p,
        calculatedScore: calculatePlayerScore(p),
      }));

      // Ordenar por score (do maior para o menor)
      playersWithScores.sort((a, b) => b.calculatedScore - a.calculatedScore);

      // Calcular número de times
      const numTeams = Math.ceil(presentPlayersList.length / playersPerTeam);
      const teams: ParticipantWithProfile[][] = Array.from(
        { length: numTeams },
        () => []
      );

      // Distribuir jogadores usando algoritmo de balanceamento
      // (Serpentine draft - zigue-zague)
      let teamIndex = 0;
      let direction = 1;

      for (const player of playersWithScores) {
        teams[teamIndex].push(player);

        teamIndex += direction;

        if (teamIndex >= numTeams || teamIndex < 0) {
          direction *= -1;
          teamIndex += direction;
        }
      }

      setGeneratedTeams(teams);
      setStep("teams");
    } catch (error) {
      console.error("Erro ao gerar times:", error);
      alert("Erro ao gerar times!");
    } finally {
      setGenerating(false);
    }
  };

  const calculateTeamAverage = (team: ParticipantWithProfile[]): number => {
    if (team.length === 0) return 0;
    const sum = team.reduce((acc, p) => acc + calculatePlayerScore(p), 0);
    return sum / team.length;
  };

  const handleSaveTeams = async () => {
    try {
      // Determinar data do evento
      let eventDate: string;
      if (event.recorrencia === "unico" && event.data_evento) {
        eventDate = event.data_evento;
      } else if (event.recorrencia === "mensal" && event.data_inicio) {
        eventDate = event.data_inicio;
      } else {
        throw new Error("Não foi possível determinar a data do evento");
      }

      // Deletar times anteriores se existirem
      const { error: deleteError } = await (supabase as any)
        .from('game_day_teams')
        .delete()
        .eq('event_id', event.id)
        .eq('event_date', eventDate);

      if (deleteError) {
        console.warn('Aviso ao deletar times antigos:', deleteError);
        // Não bloqueia a execução
      }

      // Inserir times
      for (let i = 0; i < generatedTeams.length; i++) {
        const team = generatedTeams[i];
        const teamColor = TEAM_COLORS[i % TEAM_COLORS.length];

        console.log(`Inserindo time ${i + 1}:`, {
          event_id: event.id,
          event_date: eventDate,
          team_number: i + 1,
          team_name: teamColor.name,
          team_color: teamColor.bg,
          created_by: event.criador_id,
          evaluation_type: evaluationType,
        });

        // Inserir time
        // @ts-ignore - Tabela será criada via SQL
        const { data: teamData, error: teamError } = await (supabase as any)
          .from('game_day_teams')
          .insert({
            event_id: event.id,
            event_date: eventDate,
            team_number: i + 1,
            team_name: teamColor.name,
            team_color: teamColor.bg,
            created_by: event.criador_id,
            evaluation_type: evaluationType,
          })
          .select()
          .single();

        console.log('Resultado inserção time:', { teamData, teamError });

        if (teamError) {
          console.error('Erro ao inserir time:', teamError);
          throw new Error(`Erro ao criar time ${i + 1}: ${teamError.message}`);
        }

        if (!teamData) {
          throw new Error(`Time ${i + 1} não foi criado (sem dados retornados)`);
        }

        // Inserir jogadores do time
        const playersToInsert = team.map((player, idx) => ({
          team_id: teamData.id,
          participant_id: player.id,
          player_score: calculatePlayerScore(player),
          player_order: idx + 1,
        }));

        console.log(`Inserindo ${playersToInsert.length} jogadores no time ${teamData.id}`);

        // @ts-ignore - Tabela será criada via SQL
        const { error: playersError } = await (supabase as any)
          .from('game_day_team_players')
          .insert(playersToInsert);

        if (playersError) {
          console.error('Erro ao inserir jogadores:', playersError);
          throw new Error(`Erro ao adicionar jogadores ao time ${i + 1}: ${playersError.message}`);
        }

        console.log(`✅ Time ${i + 1} criado com ${team.length} jogadores`);
      }

      console.log('✅ Todos os times foram criados com sucesso!');
      
      // Enviar notificações para todos os participantes
      await sendTeamsNotifications(eventDate);
      
      alert("✅ Times gerados e salvos com sucesso!");
      if (onTeamsGenerated) onTeamsGenerated();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar times:", error);
      
      // Mensagem de erro mais específica
      let errorMessage = "Erro ao salvar times!\n\n";
      
      if (error.message?.includes('relation') || error.code === '42P01') {
        errorMessage += "❌ As tabelas do banco ainda não foram criadas.\n\n";
        errorMessage += "Execute o SQL:\n";
        errorMessage += "/supabase/create-game-day-tables.sql\n\n";
        errorMessage += "no Supabase Dashboard > SQL Editor";
      } else if (error.message?.includes('foreign key')) {
        errorMessage += "❌ Erro de integridade no banco de dados.\n\n";
        errorMessage += "Detalhes: " + (error.message || 'Desconhecido');
      } else {
        errorMessage += error.message || error.toString();
      }
      
      alert(errorMessage);
    }
  };

  const presentPlayersCount = presentPlayers.size;
  const numTeams = Math.ceil(presentPlayersCount / playersPerTeam);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-4xl">🏆</span>
            DIA DE JOGO
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{event.titulo}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : step === "confirm" ? (
          /* STEP 1: Confirmar Presença */
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                📋 Confirmar Lista de Presença
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Marque apenas os jogadores que <strong>realmente compareceram</strong> ao
                evento. Por padrão, todos os confirmados estão selecionados.
              </p>
            </div>

            <div className="space-y-3">
              {confirmedParticipants.map((participant) => {
                const isPresent = presentPlayers.has(participant.user_id);
                return (
                  <div
                    key={participant.id}
                    onClick={() => togglePresence(participant.user_id)}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        isPresent
                          ? "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${
                          isPresent
                            ? "bg-green-500 border-green-600"
                            : "bg-white dark:bg-gray-700 border-gray-400"
                        }
                      `}
                      >
                        {isPresent && <span className="text-white text-sm">✓</span>}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {participant.profile?.nome || "Jogador"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {participant.evaluationCount! > 0
                            ? `${participant.evaluationCount} avaliações`
                            : "Sem avaliações"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Score: {calculatePlayerScore(participant).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {participant.evaluationCount! > 0 ? "Histórico" : "Auto"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                Total de Jogadores Presentes: <span className="text-green-600">{presentPlayersCount}</span>
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNextStep}
                disabled={presentPlayersCount === 0}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo: Configurar Times →
              </button>
            </div>
          </div>
        ) : step === "config" ? (
          /* STEP 2: Configurar Times */
          <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                ⚙️ Configurar Sorteio
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Defina quantos jogadores por time e qual critério de avaliação usar.
              </p>
            </div>

            {/* Jogadores por time */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                👥 Jogadores por Time
              </label>
              <input
                type="number"
                min="3"
                max={presentPlayersCount}
                value={playersPerTeam}
                onChange={(e) => setPlayersPerTeam(Math.max(3, parseInt(e.target.value) || 3))}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xl text-center"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Serão criados <strong className="text-green-600">{numTeams} time(s)</strong>
              </p>
            </div>

            {/* Tipo de avaliação */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                📊 Critério de Avaliação
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setEvaluationType("historic")}
                  className={`
                    p-6 rounded-lg border-2 transition-all
                    ${
                      evaluationType === "historic"
                        ? "bg-blue-500 border-blue-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    }
                  `}
                >
                  <div className="text-3xl mb-2">📈</div>
                  <p className="font-bold">Avaliação Histórica</p>
                  <p className="text-xs mt-1 opacity-90">
                    Usa média de avaliações anteriores
                  </p>
                </button>
                <button
                  onClick={() => setEvaluationType("auto")}
                  className={`
                    p-6 rounded-lg border-2 transition-all
                    ${
                      evaluationType === "auto"
                        ? "bg-blue-500 border-blue-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    }
                  `}
                >
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="font-bold">Autoavaliação</p>
                  <p className="text-xs mt-1 opacity-90">
                    Usa a avaliação própria do jogador
                  </p>
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                💡 Se escolher "Histórico" mas um jogador não tiver avaliações, será usada a
                autoavaliação dele
              </p>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
              >
                ← Voltar
              </button>
              <button
                onClick={generateBalancedTeams}
                disabled={generating || presentPlayersCount < playersPerTeam}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full"></div>
                    Sorteando...
                  </>
                ) : (
                  <>
                    <span>🎲</span>
                    Sortear Times!
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 3: Times Gerados */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">🎉 Times Sorteados!</h3>
              <p className="text-sm opacity-90">
                Os times foram balanceados com base na avaliação{" "}
                {evaluationType === "historic" ? "histórica" : "própria"} dos jogadores
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedTeams.map((team, index) => {
                const teamColor = TEAM_COLORS[index % TEAM_COLORS.length];
                const teamAverage = calculateTeamAverage(team);
                
                return (
                  <div
                    key={index}
                    className={`rounded-xl border-4 ${teamColor.border} overflow-hidden shadow-lg`}
                  >
                    {/* Header do Time */}
                    <div className={`${teamColor.bg} p-4 text-white`}>
                      <h4 className="text-2xl font-bold flex items-center justify-between">
                        <span>Time {teamColor.name}</span>
                        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                          #{index + 1}
                        </span>
                      </h4>
                      <p className="text-sm mt-1 opacity-90">
                        {team.length} jogador(es) • Média: {teamAverage.toFixed(2)}
                      </p>
                    </div>

                    {/* Lista de Jogadores */}
                    <div className="bg-white dark:bg-gray-800 p-4 space-y-2">
                      {team.map((player, playerIndex) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-400">
                              {playerIndex + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {player.profile?.nome || "Jogador"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {player.profile?.posicao || "Posição não definida"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {calculatePlayerScore(player).toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              score
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Vagas em aberto se time incompleto */}
                      {team.length < playersPerTeam && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-dashed border-yellow-400 dark:border-yellow-600">
                          <p className="text-sm text-yellow-700 dark:text-yellow-400 text-center">
                            ⚠️ {playersPerTeam - team.length} vaga(s) em aberto - Rodízio disponível
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setStep("config")}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
              >
                ← Refazer Sorteio
              </button>
              <button
                onClick={handleSaveTeams}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>✅</span>
                Confirmar Times
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
