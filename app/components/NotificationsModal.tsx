"use client";

import { useState } from "react";
import Modal from "./Modal";
import PaymentApprovalModal from "./PaymentApprovalModal";
import TeamsViewModal from "./TeamsViewModal";
import type { Notification } from "@/types/database.types";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
}: NotificationsModalProps) {
  const [selectedPaymentNotification, setSelectedPaymentNotification] =
    useState<Notification | null>(null);
  const [selectedTeamsNotification, setSelectedTeamsNotification] =
    useState<Notification | null>(null);

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Se for notificação de pagamento pendente, abrir modal de aprovação
    if (notification.type === "payment_pending") {
      setSelectedPaymentNotification(notification);
    }
    
    // Se for notificação de times gerados, fechar a modal de notificações e abrir modal de times
    if (notification.type === "teams_generated") {
      onClose(); // Fecha a modal de notificações
      setSelectedTeamsNotification(notification);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_pending":
        return "💳";
      case "payment_approved":
        return "✅";
      case "payment_rejected":
        return "❌";
      case "event_updated":
        return "📝";
      case "event_cancelled":
        return "🚫";
      case "participant_joined":
        return "👤";
      case "teams_generated":
        return "🏆";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "payment_pending":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "payment_approved":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "payment_rejected":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "event_updated":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "event_cancelled":
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
      case "teams_generated":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="">
        <div className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🔔 Notificações
                </h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔔</div>
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhuma notificação ainda
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getNotificationColor(
                    notification.type
                  )} ${!notification.read ? "border-l-4" : ""}`}
                >
                  {/* Badge de não lida */}
                  {!notification.read && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}

                  <div className="flex gap-3">
                    <div className="text-3xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDate(notification.created_at)}
                        </p>
                        {notification.type === "payment_pending" && (
                          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                            Clique para avaliar →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão de deletar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification.id);
                    }}
                    className="absolute bottom-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Deletar notificação"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de aprovação de pagamento */}
      {selectedPaymentNotification && (
        <PaymentApprovalModal
          isOpen={!!selectedPaymentNotification}
          onClose={() => setSelectedPaymentNotification(null)}
          notification={selectedPaymentNotification}
          onActionComplete={() => {
            setSelectedPaymentNotification(null);
            onRefresh();
          }}
        />
      )}

      {/* Modal de visualização de times */}
      {selectedTeamsNotification && (
        <TeamsViewModal
          isOpen={!!selectedTeamsNotification}
          onClose={() => setSelectedTeamsNotification(null)}
          notificationData={selectedTeamsNotification.data}
        />
      )}
    </>
  );
}
