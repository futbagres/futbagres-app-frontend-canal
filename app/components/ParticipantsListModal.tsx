"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import type { EventParticipant, EventPayment, Profile, PresenceStatus, PaymentStatus } from "@/types/database.types";

interface ParticipantWithDetails {
  participant: EventParticipant;
  profile: Profile;
  payment: EventPayment | null;
}

interface ParticipantsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  isAdmin: boolean;
}

export default function ParticipantsListModal({
  isOpen,
  onClose,
  eventId,
  isAdmin,
}: ParticipantsListModalProps) {
  const [participants, setParticipants] = useState<ParticipantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    confirmados: 0,
    pendentes: 0,
    vaoComparecer: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadParticipants();
    }
  }, [isOpen, eventId]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      // Buscar participantes
      const { data: participantsData, error: participantsError } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (participantsError) throw participantsError;

      if (!participantsData || participantsData.length === 0) {
        setParticipants([]);
        return;
      }

      // Buscar perfis dos participantes
      const userIds = participantsData.map((p: any) => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Buscar pagamentos
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("event_payments")
        .select("*")
        .eq("event_id", eventId)
        .in("user_id", userIds);

      if (paymentsError) throw paymentsError;

      // Mapear dados
      const profilesMap = new Map(
        (profilesData || []).map((p: any) => [p.id, p as Profile])
      );
      
      const paymentsMap = new Map<string, EventPayment>();
      (paymentsData || []).forEach((payment: any) => {
        const existing = paymentsMap.get(payment.user_id);
        // Manter apenas o pagamento mais recente
        if (!existing || new Date(payment.created_at) > new Date(existing.created_at)) {
          paymentsMap.set(payment.user_id, payment as EventPayment);
        }
      });

      const participantsWithDetails: ParticipantWithDetails[] = participantsData.map(
        (p: any) => ({
          participant: p as EventParticipant,
          profile: profilesMap.get(p.user_id)!,
          payment: paymentsMap.get(p.user_id) || null,
        })
      );

      setParticipants(participantsWithDetails);

      // Calcular estatísticas
      const confirmados = participantsWithDetails.filter(
        (p) => p.participant.status === "confirmado"
      ).length;
      const pendentes = participantsWithDetails.filter(
        (p) => p.participant.status === "pendente"
      ).length;
      const vaoComparecer = participantsWithDetails.filter(
        (p) => p.participant.presence_status === "confirmado"
      ).length;

      setStats({
        total: participantsWithDetails.length,
        confirmados,
        pendentes,
        vaoComparecer,
      });
    } catch (error) {
      console.error("Erro ao carregar participantes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (payment: EventPayment | null) => {
    if (!payment) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          Sem pagamento
        </span>
      );
    }

    const statusConfig: Record<
      PaymentStatus,
      { label: string; color: string }
    > = {
      pendente: { label: "Pendente", color: "bg-gray-200 text-gray-700" },
      processando: { label: "Em Análise", color: "bg-yellow-200 text-yellow-800" },
      confirmado: { label: "Confirmado", color: "bg-green-200 text-green-800" },
      cancelado: { label: "Cancelado", color: "bg-red-200 text-red-800" },
      reembolsado: { label: "Reembolsado", color: "bg-purple-200 text-purple-800" },
    };

    const config = statusConfig[payment.status];

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getPresenceStatusBadge = (status: PresenceStatus) => {
    const statusConfig: Record<
      PresenceStatus,
      { label: string; emoji: string; color: string }
    > = {
      confirmado: { label: "Vou", emoji: "✅", color: "bg-green-100 text-green-700" },
      talvez: { label: "Talvez", emoji: "🤔", color: "bg-yellow-100 text-yellow-700" },
      nao_vou: { label: "Não Vou", emoji: "❌", color: "bg-red-100 text-red-700" },
    };

    const config = statusConfig[status];

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}
      >
        {config.emoji} {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleRemoveParticipant = async (participant: EventParticipant, payment: EventPayment | null) => {
    // Verificar se o participante já pagou
    if (payment && payment.status === 'confirmado') {
      alert('❌ Não é possível remover participantes que já realizaram o pagamento!');
      return;
    }

    const confirmRemove = window.confirm(
      `Tem certeza que deseja remover este participante?\n\nIsso removerá a inscrição de forma permanente.`
    );

    if (!confirmRemove) return;

    setRemoving(participant.id);

    try {
      // Remover o participante
      const { error: participantError } = await supabase
        .from('event_participants')
        .delete()
        .eq('id', participant.id);

      if (participantError) throw participantError;

      // Se houver pagamento pendente/processando, remover também
      if (payment && payment.status !== 'confirmado') {
        const { error: paymentError } = await supabase
          .from('event_payments')
          .delete()
          .eq('id', payment.id);

        if (paymentError) console.error('Erro ao remover pagamento:', paymentError);
      }

      alert('✅ Participante removido com sucesso!');
      
      // Recarregar lista de participantes
      await loadParticipants();
    } catch (error) {
      console.error('Erro ao remover participante:', error);
      alert('❌ Erro ao remover participante. Tente novamente.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="👥 Participantes do Evento">
      <div className="max-w-4xl w-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-sm text-blue-800 dark:text-blue-300">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {stats.confirmados}
                </p>
                <p className="text-sm text-green-800 dark:text-green-300">
                  Pagamento OK
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pendentes}
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Pendentes
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {stats.vaoComparecer}
                </p>
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  Vão comparecer
                </p>
              </div>
            </div>

            {/* Lista de participantes */}
            {participants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum participante inscrito ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {participants.map(({ participant, profile, payment }) => (
                  <div
                    key={participant.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Info do participante */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                            {profile.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {profile.nome}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {profile.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                          {getPaymentStatusBadge(payment)}
                          {getPresenceStatusBadge(participant.presence_status)}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Inscrito em {formatDate(participant.created_at)}
                          </span>
                        </div>

                        {/* Informações extras para admin */}
                        {isAdmin && payment && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            {payment.metodo_pagamento && (
                              <span className="mr-3">
                                💳 {payment.metodo_pagamento.toUpperCase()}
                              </span>
                            )}
                            {payment.valor && (
                              <span>
                                💰 R$ {payment.valor.toFixed(2).replace(".", ",")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Botão de Remover (apenas para admin) */}
                      {isAdmin && (
                        <div className="flex-shrink-0">
                          {payment && payment.status === 'confirmado' ? (
                            <button
                              disabled
                              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg text-sm font-semibold cursor-not-allowed"
                              title="Não é possível remover participantes que já pagaram"
                            >
                              🔒 Pago
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRemoveParticipant(participant, payment)}
                              disabled={removing === participant.id}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              title="Remover participante"
                            >
                              {removing === participant.id ? (
                                <>
                                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                </>
                              ) : (
                                <>
                                  <span>🗑️</span>
                                  Remover
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
