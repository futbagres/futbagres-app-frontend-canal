"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import { approvePayment, rejectPayment } from "@/lib/payment-utils";
import { getSignedReceiptUrl } from "@/lib/receipt-upload";
import type { Notification } from "@/types/database.types";

interface PaymentApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: Notification;
  onActionComplete: () => void;
}

export default function PaymentApprovalModal({
  isOpen,
  onClose,
  notification,
  onActionComplete,
}: PaymentApprovalModalProps) {
  const [payment, setPayment] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Carregar dados do pagamento
  useEffect(() => {
    if (!notification.data) return;

    const loadPaymentData = async () => {
      try {
        const { event_id, participant_id, user_id } = notification.data;

        // Buscar pagamento
        const { data: paymentData, error: paymentError } = await supabase
          .from("event_payments")
          .select("*")
          .eq("event_id", event_id)
          .eq("user_id", user_id)
          .eq("status", "processando")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (paymentError) throw paymentError;
        setPayment(paymentData);

        // Buscar participante
        const { data: participantData } = await supabase
          .from("event_participants")
          .select("*")
          .eq("id", participant_id)
          .single();

        setParticipant(participantData);

        // Buscar perfil do usuário
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user_id)
          .single();

        setUserProfile(profileData);

        // Buscar evento
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .eq("id", event_id)
          .single();

        setEvent(eventData);

        // Obter URL assinada do comprovante
        // @ts-ignore
        if (paymentData?.comprovante_url) {
          // @ts-ignore
          const url = await getSignedReceiptUrl(paymentData.comprovante_url);
          setComprovanteUrl(url);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do pagamento:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [notification]);

  const handleApprove = async () => {
    if (!payment) return;

    setProcessing(true);
    try {
      const result = await approvePayment(payment.id);

      if (result.success) {
        alert("✅ Pagamento aprovado com sucesso!");
        onActionComplete();
        onClose();
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.error("Erro ao aprovar pagamento:", error);
      alert("❌ Erro ao aprovar pagamento");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!payment) return;

    setProcessing(true);
    try {
      const result = await rejectPayment(payment.id, rejectReason);

      if (result.success) {
        alert("❌ Pagamento rejeitado");
        onActionComplete();
        onClose();
        setShowRejectModal(false);
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.error("Erro ao rejeitar pagamento:", error);
      alert("❌ Erro ao rejeitar pagamento");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Carregando...">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </Modal>
    );
  }

  if (!payment) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Erro">
        <div className="p-8 text-center">
          <p className="text-red-600">Pagamento não encontrado ou já foi processado</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg"
          >
            Fechar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen && !showRejectModal} onClose={onClose} title="">
        <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              💳 Aprovar Pagamento
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Verifique o comprovante e aprove ou rejeite o pagamento
            </p>
          </div>

          {/* Informações do Evento */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              📅 Evento
            </h3>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {event?.titulo}
            </p>
          </div>

          {/* Informações do Participante */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              👤 Participante
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Nome:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {userProfile?.nome || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {userProfile?.email || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status Atual:</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {participant?.status === "pendente" ? "⏳ Pendente" : participant?.status}
                </span>
              </div>
            </div>
          </div>

          {/* Informações do Pagamento */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              💰 Detalhes do Pagamento
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  R$ {payment.valor?.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Método:</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {payment.metodo_pagamento}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Data do Envio:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(payment.data_pagamento).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          </div>

          {/* Comprovante */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              📎 Comprovante de Pagamento
            </h3>
            {comprovanteUrl ? (
              <div className="space-y-3">
                <img
                  src={comprovanteUrl}
                  alt="Comprovante de pagamento"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600"
                  onError={(e) => {
                    // Se falhar ao carregar imagem, tentar como PDF
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const iframe = document.createElement("iframe");
                    iframe.src = comprovanteUrl;
                    iframe.className = "w-full h-96 rounded-lg border border-gray-300 dark:border-gray-600";
                    target.parentElement?.appendChild(iframe);
                  }}
                />
                <a
                  href={comprovanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  🔗 Abrir comprovante em nova aba
                </a>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Comprovante não disponível
              </p>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processando...
                </>
              ) : (
                <>
                  <span>✅</span>
                  Aprovar Pagamento
                </>
              )}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>❌</span>
              Rejeitar
            </button>
            <button
              onClick={onClose}
              disabled={processing}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação de rejeição */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Rejeitar Pagamento"
      >
        <div className="max-w-md w-full p-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Deseja rejeitar este pagamento? Você pode adicionar um motivo para o participante.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo da rejeição (opcional)"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            rows={4}
          />
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleReject}
              disabled={processing}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {processing ? "Processando..." : "Confirmar Rejeição"}
            </button>
            <button
              onClick={() => setShowRejectModal(false)}
              disabled={processing}
              className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
