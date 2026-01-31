"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import UserProfileModal from "../components/UserProfileModal";
import UserSearch from "../../components/UserSearch";
import FollowButton from "../../components/FollowButton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getFollowers, getFollowing, getFollowerStats } from "@/lib/friendships";

interface UserProfile {
  id: string;
  nome: string;
  avatar_url: string | null;
  posicao: string | null;
}

interface FollowerItem {
  id: string;
  follower_id: string;
  created_at: string;
  follower_profile: UserProfile;
}

interface FollowingItem {
  id: string;
  following_id: string;
  created_at: string;
  following_profile: UserProfile;
}

export default function AmigosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'search' | 'followers' | 'following'>('search');
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [profileModal, setProfileModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: '',
    userName: ''
  });

  const openProfileModal = (userId: string, userName: string) => {
    setProfileModal({
      isOpen: true,
      userId,
      userName
    });
  };

  const closeProfileModal = () => {
    setProfileModal({
      isOpen: false,
      userId: '',
      userName: ''
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const statsData = await getFollowerStats(user.id);
      setStats(statsData);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const loadFollowers = async () => {
    if (!user?.id) return;

    setLoadingData(true);
    try {
      const followersData = await getFollowers(user.id);
      setFollowers(followersData);
    } catch (error) {
      console.error("Erro ao carregar seguidores:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadFollowing = async () => {
    if (!user?.id) return;

    setLoadingData(true);
    try {
      const followingData = await getFollowing(user.id);
      setFollowing(followingData);
    } catch (error) {
      console.error("Erro ao carregar seguindo:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleTabChange = (tab: 'search' | 'followers' | 'following') => {
    setActiveTab(tab);

    if (tab === 'followers' && followers.length === 0) {
      loadFollowers();
    } else if (tab === 'following' && following.length === 0) {
      loadFollowing();
    }
  };

  const getPositionEmoji = (position: string | null) => {
    const emojis: Record<string, string> = {
      goleiro: "🧤",
      zagueiro: "🛡️",
      lateral: "➡️",
      volante: "⚙️",
      meia: "🎯",
      atacante: "⚡"
    };
    return emojis[position || ""] || "👤";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Cabeçalho */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                👥 Meus Amigos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Conecte-se com outros jogadores de futebol
              </p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.followersCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Seguidores</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.followingCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Seguindo</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              {[
                { id: 'search', label: 'Buscar Amigos', icon: '🔍' },
                { id: 'followers', label: 'Seguidores', icon: '👥' },
                { id: 'following', label: 'Seguindo', icon: '❤️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo das tabs */}
            <div className="min-h-[400px]">
              {activeTab === 'search' && (
                <div className="text-center">
                  <UserSearch
                    placeholder="Buscar jogadores por nome ou ID..."
                    maxResults={20}
                  />
                </div>
              )}

              {activeTab === 'followers' && (
                <div>
                  {loadingData ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Carregando seguidores...</p>
                    </div>
                  ) : followers.length > 0 ? (
                    <div className="space-y-4">
                      {followers.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                              {item.follower_profile.avatar_url ? (
                                <img
                                  src={item.follower_profile.avatar_url}
                                  alt={item.follower_profile.nome}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                item.follower_profile.nome.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div
                                className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                onClick={() => openProfileModal(item.follower_id, item.follower_profile.nome)}
                              >
                                {item.follower_profile.nome}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {item.follower_profile.posicao && (
                                  <span className="mr-2">
                                    {getPositionEmoji(item.follower_profile.posicao)} {item.follower_profile.posicao}
                                  </span>
                                )}
                                Segue desde {formatDate(item.created_at)}
                              </div>
                            </div>
                          </div>
                          <FollowButton
                            targetUserId={item.follower_id}
                            targetUserName={item.follower_profile.nome}
                            size="sm"
                            variant="secondary"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">😢</div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Você ainda não tem seguidores
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Compartilhe seu perfil para ganhar seguidores!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'following' && (
                <div>
                  {loadingData ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Carregando quem você segue...</p>
                    </div>
                  ) : following.length > 0 ? (
                    <div className="space-y-4">
                      {following.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                              {item.following_profile.avatar_url ? (
                                <img
                                  src={item.following_profile.avatar_url}
                                  alt={item.following_profile.nome}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                item.following_profile.nome.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div
                                className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                onClick={() => openProfileModal(item.following_id, item.following_profile.nome)}
                              >
                                {item.following_profile.nome}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {item.following_profile.posicao && (
                                  <span className="mr-2">
                                    {getPositionEmoji(item.following_profile.posicao)} {item.following_profile.posicao}
                                  </span>
                                )}
                                Seguindo desde {formatDate(item.created_at)}
                              </div>
                            </div>
                          </div>
                          <FollowButton
                            targetUserId={item.following_id}
                            targetUserName={item.following_profile.nome}
                            size="sm"
                            variant="secondary"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🔍</div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Você ainda não segue ninguém
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Use a aba "Buscar Amigos" para encontrar jogadores!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <UserProfileModal
        isOpen={profileModal.isOpen}
        onClose={closeProfileModal}
        userId={profileModal.userId}
        userName={profileModal.userName}
      />
    </>
  );
}