"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import FollowButton from "../../components/FollowButton";
import { getUserById } from "@/lib/friendships";

interface UserProfile {
  id: string;
  nome: string;
  avatar_url: string | null;
  posicao: string | null;
  email?: string;
  role?: string;
  auto_defesa?: number | null;
  auto_velocidade?: number | null;
  auto_passe?: number | null;
  auto_chute?: number | null;
  auto_drible?: number | null;
  chave_pix?: string | null;
  created_at?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const getPositionEmoji = (position: string) => {
  const emojiMap: { [key: string]: string } = {
    goleiro: "🥅",
    zagueiro: "🛡️",
    lateral: "🏃",
    volante: "⚽",
    meia: "🎯",
    atacante: "⚡"
  };
  return emojiMap[position.toLowerCase()] || "⚽";
};

const getRatingStars = (rating: number | null | undefined) => {
  if (rating == null) return "Não avaliado";
  const stars = "⭐".repeat(Math.floor(rating));
  return `${stars} ${rating.toFixed(1)}`;
};

export default function UserProfileModal({ isOpen, onClose, userId, userName }: UserProfileModalProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadUserProfile();
    }
  }, [isOpen, userId]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const profile = await getUserById(userId);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Perfil de ${userName}`}>
      <div className="max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando perfil...</p>
          </div>
        ) : userProfile ? (
          <div className="space-y-6">
            {/* Avatar e informações básicas */}
            <div className="text-center">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.nome}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  userProfile.nome.charAt(0).toUpperCase()
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {userProfile.nome}
              </h3>
              {userProfile.posicao && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {getPositionEmoji(userProfile.posicao)} {userProfile.posicao}
                </p>
              )}
              <div className="mb-4">
                <FollowButton
                  targetUserId={userProfile.id}
                  targetUserName={userProfile.nome}
                  size="md"
                  variant="primary"
                />
              </div>
            </div>

            {/* Avaliações */}
            {(userProfile.auto_defesa !== null || userProfile.auto_velocidade !== null || userProfile.auto_passe !== null ||
              userProfile.auto_chute !== null || userProfile.auto_drible !== null) && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Avaliações</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {userProfile.auto_defesa !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Defesa:</span>
                      <span className="font-medium">{getRatingStars(userProfile.auto_defesa)}</span>
                    </div>
                  )}
                  {userProfile.auto_velocidade !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Velocidade:</span>
                      <span className="font-medium">{getRatingStars(userProfile.auto_velocidade)}</span>
                    </div>
                  )}
                  {userProfile.auto_passe !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Passe:</span>
                      <span className="font-medium">{getRatingStars(userProfile.auto_passe)}</span>
                    </div>
                  )}
                  {userProfile.auto_chute !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Chute:</span>
                      <span className="font-medium">{getRatingStars(userProfile.auto_chute)}</span>
                    </div>
                  )}
                  {userProfile.auto_drible !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Drible:</span>
                      <span className="font-medium">{getRatingStars(userProfile.auto_drible)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações adicionais */}
            <div className="space-y-3">
              {userProfile.email && userProfile.email.trim() && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{userProfile.email}</span>
                </div>
              )}
              {userProfile.role && userProfile.role.trim() && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Função:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{userProfile.role}</span>
                </div>
              )}
              {userProfile.chave_pix && userProfile.chave_pix.trim() && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Chave PIX:</span>
                  <span className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                    {userProfile.chave_pix.length > 20 ? `${userProfile.chave_pix.substring(0, 20)}...` : userProfile.chave_pix}
                  </span>
                </div>
              )}
              {userProfile.created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Membro desde:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(userProfile.created_at)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">😕</div>
            <p className="text-gray-600 dark:text-gray-400">
              Não foi possível carregar o perfil
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}