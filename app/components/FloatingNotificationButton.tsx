"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import NotificationsModal from "./NotificationsModal";
import type { Notification } from "@/types/database.types";

interface FloatingNotificationButtonProps {
  userId: string;
}

export default function FloatingNotificationButton({ userId }: FloatingNotificationButtonProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Carregar notificações
  const loadNotifications = async () => {
    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      const newUnreadCount = data?.filter((n: Notification) => !n.read).length || 0;
      
      // Animar se tiver novas notificações
      if (newUnreadCount > unreadCount && unreadCount > 0) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }
      
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from("notifications")
        // @ts-ignore
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // Atualizar estado local
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      // @ts-ignore
      const { error } = await supabase
        .from("notifications")
        // @ts-ignore
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;

      // Atualizar estado local
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  // Deletar notificação
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      // Atualizar estado local
      const deletedNotif = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
    }
  };

  // Carregar ao montar e configurar real-time
  useEffect(() => {
    loadNotifications();

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Notificação em tempo real:", payload);
          loadNotifications(); // Recarregar todas
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-6 right-6 z-[90] w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group ${
          isAnimating ? 'animate-bounce' : ''
        }`}
        title="Notificações"
      >
        {/* Ícone de Apito - Usando imagem personalizada */}
        <img
          src="/whistle.png"
          alt="Notificações"
          className="w-8 h-8 object-contain transform group-hover:rotate-12 transition-transform"
        />

        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Efeito de ondas quando há notificações */}
        {unreadCount > 0 && (
          <>
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20"></span>
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-10" style={{ animationDelay: '0.5s' }}></span>
          </>
        )}
      </button>

      <NotificationsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        onRefresh={loadNotifications}
      />
    </>
  );
}
