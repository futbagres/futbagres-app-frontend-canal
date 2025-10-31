"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import {
  getEventPaymentSummary,
  approvePayment,
  rejectPayment,
} from "@/lib/payment-utils";
import { getSignedReceiptUrl } from "@/lib/receipt-upload";
import type { EventPayment, Profile } from "@/types/database.types";

interface PaymentWithProfile {
  payment: EventPayment;
  profile: Profile;
}

interface EventPaymentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onPaymentUpdated?: () => void;
}

export default function EventPaymentsPanel({
  isOpen,
  onClose,
  eventId,
  onPaymentUpdated,
}: EventPaymentsPanelProps) {
  const [payments, setPayments] = useState<PaymentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    confirmados: 0,
    processando: 0,
    pendentes: 0,
    totalArrecadado: 0,
    totalEsperado: 0,
  });
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPayments();
      loadSummary();
    }
  }, [isOpen, eventId]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("event_payments")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        return;
      }

      // Buscar perfis dos usuários
      const userIds = paymentsData.map((p: any) => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        (profilesData || []).map((p: any) => [p.id, p as Profile])
      );

      const paymentsWithProfiles: PaymentWithProfile[] = paymentsData.map(
        (p: any) => ({
          payment: p as EventPayment,
          profile: profilesMap.get(p.user_id)!,
        })
      );

      setPayments(paymentsWithProfiles);
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    const stats = await getEventPaymentSummary(eventId);
    setSummary(stats);
  };

  const handleApprove = async (paymentId: string) => {
    if (
      !confirm("Tem certeza que deseja aprovar este pagamento?")
    ) {
      return;
    }

    setProcessingId(paymentId);
    try {
      const result = await approvePayment(paymentId);

      if (result.success) {
        alert("✅ Pagamento aprovado com sucesso!");
        await loadPayments();
        await loadSummary();
        if (onPaymentUpdated) onPaymentUpdated();
      } else {
        alert(`❌ Erro ao aprovar pagamento: ${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Erro ao aprovar pagamento: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    const motivo = prompt(
      "Digite o motivo da rejeição (opcional):"
    );

    if (motivo === null) return; // Cancelou

    setProcessingId(paymentId);
    try {
      const result = await rejectPayment(paymentId, motivo || undefined);

      if (result.success) {
        alert("✅ Pagamento rejeitado!");
        await loadPayments();
        await loadSummary();
        if (onPaymentUpdated) onPaymentUpdated();
      } else {
        alert(`❌ Erro ao rejeitar pagamento: ${result.error}`);
      }
    } catch (error: any) {
      alert(`❌ Erro ao rejeitar pagamento: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewReceipt = async (comprovanteUrl: string) => {
    try {
      // Tentar obter URL assinada (para buckets privados)
      const signedUrl = await getSignedReceiptUrl(comprovanteUrl);
      setSelectedReceipt(signedUrl);
    } catch (error) {
      // Se falhar, usar URL pública diretamente
      setSelectedReceipt(comprovanteUrl);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const paymentsProcessando = payments.filter(
    (p) => p.payment.status === "processando"
  );
  const paymentsConfirmados = payments.filter(
    (p) => p.payment.status === "confirmado"
  );
  const paymentsOutros = payments.filter(
    (p) => !["processando", "confirmado"].includes(p.payment.status)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💰 Caixinha do Evento">
      <div className="max-w-5xl w-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Resumo Financeiro */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300 mb-1">
                  💰 Total Arrecadado
                </p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {summary.totalArrecadado.toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-1">
                  📊 Total Esperado
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {summary.totalEsperado.toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-1">
                  ⏳ Pendentes de Aprovação
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary.processando}
                </p>
              </div>
            </div>

            {/* Pagamentos Pendentes de Aprovação */}
            {paymentsProcessando.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  ⏳ Aguardando Aprovação ({paymentsProcessando.length})
                </h3>
                <div className="space-y-3">
                  {paymentsProcessando.map(({ payment, profile }) => (
                    <div
                      key={payment.id}
                      className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                              {profile.nome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {profile.nome}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {profile.email}
                              </p>
                            </div>
                          </div>

                          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <p>
                              💰 <strong>Valor:</strong> R${" "}
                              {payment.valor.toFixed(2).replace(".", ",")}
                            </p>
                            <p>
                              💳 <strong>Método:</strong>{" "}
                              {payment.metodo_pagamento?.toUpperCase() || "N/A"}
                            </p>
                            <p>
                              📅 <strong>Enviado em:</strong>{" "}
                              {formatDate(payment.created_at)}
                            </p>
                          </div>

                          {payment.comprovante_url && (
                            <button
                              type="button"
                              onClick={() =>
                                handleViewReceipt(payment.comprovante_url!)
                              }
                              className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                            >
                              📷 Ver Comprovante
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(payment.id)}
                            disabled={processingId === payment.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            ✅ Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(payment.id)}
                            disabled={processingId === payment.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            ❌ Rejeitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagamentos Confirmados */}
            {paymentsConfirmados.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  ✅ Pagamentos Confirmados ({paymentsConfirmados.length})
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {paymentsConfirmados.map(({ payment, profile }) => (
                    <div
                      key={payment.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {profile.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {profile.nome}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(payment.data_pagamento)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            R$ {payment.valor.toFixed(2).replace(".", ",")}
                          </p>
                          {payment.comprovante_url && (
                            <button
                              type="button"
                              onClick={() =>
                                handleViewReceipt(payment.comprovante_url!)
                              }
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Ver comprovante
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outros Status */}
            {paymentsOutros.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  📋 Outros Status ({paymentsOutros.length})
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {paymentsOutros.map(({ payment, profile }) => (
                    <div
                      key={payment.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {profile.nome}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Status: {payment.status}
                          </p>
                        </div>
                        <p className="font-bold text-gray-600 dark:text-gray-400">
                          R$ {payment.valor.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {payments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum pagamento registrado ainda
                </p>
              </div>
            )}
          </>
        )}

        {/* Modal de visualização de comprovante */}
        {selectedReceipt && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReceipt(null)}
          >
            <div className="max-w-4xl max-h-[90vh] overflow-auto">
              <img
                src={selectedReceipt}
                alt="Comprovante de pagamento"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
