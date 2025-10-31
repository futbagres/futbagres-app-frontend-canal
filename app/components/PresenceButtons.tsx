"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { checkPaymentStatus, eventRequiresPayment } from "@/lib/payment-utils";
import type { EventParticipant, EventPayment, PresenceStatus } from "@/types/database.types";

interface PresenceButtonsProps {
  eventId: string;
  userId: string;
  participant: EventParticipant | null;
  onStatusChange?: () => void;
}

export default function PresenceButtons({
  eventId,
  userId,
  participant,
  onStatusChange,
}: PresenceButtonsProps) {
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus | null>(
    participant?.presence_status || null
  );
  const [loading, setLoading] = useState(false);
  const [paymentValid, setPaymentValid] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verificar pagamento ao carregar
  useEffect(() => {
    checkPayment();
  }, [eventId, userId]);

  const checkPayment = async () => {
    setChecking(true);
    try {
      // Verificar se evento requer pagamento
      const requires = await eventRequiresPayment(eventId);
      setRequiresPayment(requires);

      if (!requires) {
        // Evento gratuito - sempre permitir
        setPaymentValid(true);
        setPaymentMessage("Evento gratuito");
        return;
      }

      // Verificar status do pagamento
      const result = await checkPaymentStatus(userId, eventId);
      setPaymentValid(result.isValid);
      setPaymentMessage(result.message);
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
      setPaymentValid(false);
      setPaymentMessage("Erro ao verificar pagamento");
    } finally {
      setChecking(false);
    }
  };

  const handleStatusChange = async (newStatus: PresenceStatus) => {
    if (!participant) return;

    setLoading(true);
    try {
      // @ts-ignore
      const { error } = await supabase
        .from("event_participants")
        // @ts-ignore
        .update({ presence_status: newStatus })
        .eq("id", participant.id);

      if (error) throw error;

      setCurrentStatus(newStatus);
      if (onStatusChange) onStatusChange();
    } catch (error: any) {
      console.error("Erro ao atualizar presença:", error);
      alert("Erro ao atualizar presença. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin h-6 w-6 border-2 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!participant) {
    return null;
  }

  const buttons: {
    status: PresenceStatus;
    label: string;
    emoji: string;
    color: string;
    hoverColor: string;
    activeColor: string;
  }[] = [
    {
      status: "confirmado",
      label: "Vou",
      emoji: "✅",
      color: "bg-green-100 text-green-700 border-green-300",
      hoverColor: "hover:bg-green-200",
      activeColor: "bg-green-600 text-white border-green-600",
    },
    {
      status: "talvez",
      label: "Talvez",
      emoji: "🤔",
      color: "bg-yellow-100 text-yellow-700 border-yellow-300",
      hoverColor: "hover:bg-yellow-200",
      activeColor: "bg-yellow-600 text-white border-yellow-600",
    },
    {
      status: "nao_vou",
      label: "Não Vou",
      emoji: "❌",
      color: "bg-red-100 text-red-700 border-red-300",
      hoverColor: "hover:bg-red-200",
      activeColor: "bg-red-600 text-white border-red-600",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Mensagem de status de pagamento */}
      {requiresPayment && (
        <div
          className={`text-sm p-3 rounded-lg border ${
            paymentValid
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
          }`}
        >
          {paymentValid ? "✅" : "⚠️"} {paymentMessage}
        </div>
      )}

      {/* Botões de presença */}
      <div className="flex gap-2">
        {buttons.map((btn) => {
          const isActive = currentStatus === btn.status;
          const isDisabled = loading || (!paymentValid && requiresPayment);

          return (
            <button
              key={btn.status}
              type="button"
              onClick={() => handleStatusChange(btn.status)}
              disabled={isDisabled}
              className={`
                flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all duration-200
                ${isActive 
                  ? `${btn.activeColor} shadow-lg scale-105 ring-2 ring-offset-2 ring-${btn.activeColor.split('-')[1]}-400` 
                  : `${btn.color} ${btn.hoverColor} opacity-40 grayscale hover:opacity-100 hover:grayscale-0`
                }
                ${isDisabled
                  ? "opacity-30 cursor-not-allowed grayscale"
                  : "cursor-pointer hover:scale-105"
                }
              `}
              title={
                isDisabled && requiresPayment
                  ? "Você precisa ter um pagamento confirmado para alterar sua presença"
                  : undefined
              }
            >
              <div className="flex items-center justify-center">
                <span className={`text-xl transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {btn.emoji}
                </span>
                <span className="ml-2 text-sm">{btn.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Texto explicativo quando bloqueado */}
      {!paymentValid && requiresPayment && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          🔒 Confirme seu pagamento para poder alterar sua presença
        </p>
      )}
    </div>
  );
}
