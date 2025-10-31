import { supabase } from "./supabase";
import type { EventPayment } from "@/types/database.types";

interface PaymentStatusResult {
  isValid: boolean;
  payment: EventPayment | null;
  message: string;
}

/**
 * Verifica se o usuário está com pagamento em dia para um evento
 * @param userId ID do usuário
 * @param eventId ID do evento
 * @returns Status do pagamento
 */
export async function checkPaymentStatus(
  userId: string,
  eventId: string
): Promise<PaymentStatusResult> {
  try {
    // Buscar último pagamento do usuário para este evento
    const { data: payments, error } = await supabase
      .from("event_payments")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Erro ao buscar pagamento:", error);
      return {
        isValid: false,
        payment: null,
        message: "Erro ao verificar pagamento",
      };
    }

    // Nenhum pagamento encontrado
    if (!payments || payments.length === 0) {
      return {
        isValid: false,
        payment: null,
        message: "Pagamento pendente. Você precisa pagar para confirmar presença.",
      };
    }

    const payment = payments[0] as EventPayment;

    // Verificar status do pagamento
    if (payment.status === "pendente") {
      return {
        isValid: false,
        payment,
        message: "Pagamento pendente. Você precisa fazer o pagamento.",
      };
    }

    if (payment.status === "processando") {
      return {
        isValid: false,
        payment,
        message:
          "Pagamento em análise. Aguarde a aprovação do organizador para confirmar presença.",
      };
    }

    if (payment.status === "cancelado") {
      return {
        isValid: false,
        payment,
        message: "Pagamento cancelado. Entre em contato com o organizador.",
      };
    }

    if (payment.status === "reembolsado") {
      return {
        isValid: false,
        payment,
        message: "Pagamento reembolsado. Você não pode mais confirmar presença.",
      };
    }

    // Status confirmado - verificar validade
    if (payment.status === "confirmado") {
      // Se não tem data de validade, considerar válido
      if (!payment.data_validade) {
        return {
          isValid: true,
          payment,
          message: "Pagamento confirmado",
        };
      }

      // Verificar se está dentro da validade
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
      
      const validade = new Date(payment.data_validade);
      validade.setHours(0, 0, 0, 0);

      if (hoje <= validade) {
        // Avisar se está próximo do vencimento (7 dias)
        const diasRestantes = Math.ceil(
          (validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diasRestantes <= 7 && diasRestantes > 0) {
          return {
            isValid: true,
            payment,
            message: `Pagamento válido. Vence em ${diasRestantes} dia(s).`,
          };
        }

        return {
          isValid: true,
          payment,
          message: "Pagamento confirmado",
        };
      } else {
        return {
          isValid: false,
          payment,
          message: "Pagamento vencido. Renove seu pagamento para confirmar presença.",
        };
      }
    }

    // Status desconhecido
    return {
      isValid: false,
      payment,
      message: "Status de pagamento desconhecido. Entre em contato com o organizador.",
    };
  } catch (err: any) {
    console.error("Erro em checkPaymentStatus:", err);
    return {
      isValid: false,
      payment: null,
      message: "Erro ao verificar pagamento",
    };
  }
}

/**
 * Verifica se um evento requer pagamento
 * @param eventId ID do evento
 * @returns Se o evento requer pagamento
 */
export async function eventRequiresPayment(eventId: string): Promise<boolean> {
  try {
    // @ts-ignore
    const { data: event, error } = await supabase
      .from("events")
      .select("requer_pagamento, valor_por_pessoa")
      .eq("id", eventId)
      .single();

    if (error || !event) return false;

    // @ts-ignore
    return event.requer_pagamento === true && event.valor_por_pessoa > 0;
  } catch (err) {
    console.error("Erro em eventRequiresPayment:", err);
    return false;
  }
}

/**
 * Calcula a data de validade do pagamento baseado na sazonalidade
 * @param dataEvento Data do evento
 * @param sazonalidadeMeses Quantidade de meses de validade (1, 3, 6, 12)
 * @returns Data de validade
 */
export function calculatePaymentValidity(
  dataEvento: string,
  sazonalidadeMeses: number | null
): string {
  const dataBase = new Date(dataEvento);

  if (!sazonalidadeMeses || sazonalidadeMeses <= 0) {
    // Sem sazonalidade, válido apenas para o evento específico
    return dataEvento;
  }

  // Adicionar meses de sazonalidade
  const validade = new Date(dataBase);
  validade.setMonth(validade.getMonth() + sazonalidadeMeses);

  return validade.toISOString().split("T")[0];
}

/**
 * Obtém resumo de pagamentos de um evento
 * @param eventId ID do evento
 * @returns Estatísticas de pagamento
 */
export async function getEventPaymentSummary(eventId: string): Promise<{
  total: number;
  confirmados: number;
  processando: number;
  pendentes: number;
  totalArrecadado: number;
  totalEsperado: number;
}> {
  try {
    const { data: payments, error } = await supabase
      .from("event_payments")
      .select("status, valor")
      .eq("event_id", eventId);

    if (error || !payments) {
      return {
        total: 0,
        confirmados: 0,
        processando: 0,
        pendentes: 0,
        totalArrecadado: 0,
        totalEsperado: 0,
      };
    }

    const confirmados = payments.filter((p: any) => p.status === "confirmado");
    const processando = payments.filter((p: any) => p.status === "processando");
    const pendentes = payments.filter((p: any) => p.status === "pendente");

    const totalArrecadado = confirmados.reduce(
      (sum: number, p: any) => sum + (p.valor || 0),
      0
    );

    const totalEsperado = payments.reduce(
      (sum: number, p: any) => sum + (p.valor || 0),
      0
    );

    return {
      total: payments.length,
      confirmados: confirmados.length,
      processando: processando.length,
      pendentes: pendentes.length,
      totalArrecadado,
      totalEsperado,
    };
  } catch (err: any) {
    console.error("Erro em getEventPaymentSummary:", err);
    return {
      total: 0,
      confirmados: 0,
      processando: 0,
      pendentes: 0,
      totalArrecadado: 0,
      totalEsperado: 0,
    };
  }
}

/**
 * Aprova um pagamento e atualiza o status do participante
 * @param paymentId ID do pagamento a aprovar
 * @returns Sucesso ou erro
 */
export async function approvePayment(paymentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Buscar informações do pagamento
    const { data: payment, error: fetchError } = await supabase
      .from("event_payments")
      .select("*, events(*)")
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) {
      return {
        success: false,
        error: "Pagamento não encontrado",
      };
    }

    // @ts-ignore
    const event = payment.events;
    
    // Calcular data de validade
    let dataValidade = null;
    if (event.data_evento) {
      dataValidade = calculatePaymentValidity(
        event.data_evento,
        event.sazonalidade_meses
      );
    }

    // Atualizar pagamento para confirmado
    // @ts-ignore
    const { error: updatePaymentError } = await supabase
      .from("event_payments")
      // @ts-ignore
      .update({
        status: "confirmado",
        data_pagamento: new Date().toISOString(),
        data_validade: dataValidade,
      })
      .eq("id", paymentId);

    if (updatePaymentError) {
      console.error("Erro ao atualizar pagamento:", updatePaymentError);
      return {
        success: false,
        error: "Erro ao aprovar pagamento",
      };
    }

    // Atualizar status do participante para confirmado
    // @ts-ignore
    const { error: updateParticipantError } = await supabase
      .from("event_participants")
      // @ts-ignore
      .update({
        status: "confirmado",
      })
      // @ts-ignore
      .eq("id", payment.participant_id);

    if (updateParticipantError) {
      console.error("Erro ao atualizar participante:", updateParticipantError);
      // Não retornar erro aqui pois o pagamento já foi aprovado
    }

    // Criar notificação para o usuário
    try {
      // @ts-ignore
      await supabase.from("notifications").insert({
        // @ts-ignore
        user_id: payment.user_id,
        type: "payment_approved",
        title: "Pagamento aprovado! 🎉",
        // @ts-ignore
        message: `Seu pagamento para o evento "${event.titulo}" foi aprovado. Agora você pode confirmar sua presença!`,
        data: {
          // @ts-ignore
          event_id: payment.event_id,
          payment_id: paymentId,
        },
        read: false,
      });
    } catch (notifError) {
      console.error("Erro ao criar notificação de aprovação:", notifError);
      // Não bloquear o fluxo
    }

    return { success: true };
  } catch (err: any) {
    console.error("Erro em approvePayment:", err);
    return {
      success: false,
      error: err.message || "Erro ao aprovar pagamento",
    };
  }
}

/**
 * Rejeita um pagamento
 * @param paymentId ID do pagamento a rejeitar
 * @param motivo Motivo da rejeição (opcional)
 * @returns Sucesso ou erro
 */
export async function rejectPayment(
  paymentId: string,
  motivo?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Buscar informações do pagamento antes de atualizar
    const { data: payment, error: fetchError } = await supabase
      .from("event_payments")
      .select("*, events(*)")
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) {
      return {
        success: false,
        error: "Pagamento não encontrado",
      };
    }

    // @ts-ignore
    const { error } = await supabase
      .from("event_payments")
      // @ts-ignore
      .update({
        status: "cancelado",
        observacoes: motivo || "Comprovante rejeitado pelo organizador",
      })
      .eq("id", paymentId);

    if (error) {
      console.error("Erro ao rejeitar pagamento:", error);
      return {
        success: false,
        error: "Erro ao rejeitar pagamento",
      };
    }

    // Criar notificação para o usuário
    try {
      // @ts-ignore
      const event = payment.events;
      // @ts-ignore
      await supabase.from("notifications").insert({
        // @ts-ignore
        user_id: payment.user_id,
        type: "payment_rejected",
        title: "Pagamento não aprovado",
        // @ts-ignore
        message: `Seu comprovante para o evento "${event.titulo}" não foi aprovado. ${motivo ? `Motivo: ${motivo}` : 'Entre em contato com o organizador para mais informações.'}`,
        data: {
          // @ts-ignore
          event_id: payment.event_id,
          payment_id: paymentId,
          motivo: motivo || null,
        },
        read: false,
      });
    } catch (notifError) {
      console.error("Erro ao criar notificação de rejeição:", notifError);
      // Não bloquear o fluxo
    }

    return { success: true };
  } catch (err: any) {
    console.error("Erro em rejectPayment:", err);
    return {
      success: false,
      error: err.message || "Erro ao rejeitar pagamento",
    };
  }
}
