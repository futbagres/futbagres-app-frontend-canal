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
  const [activeTab, setActiveTab] = useState<'search' | 'followers' | 'following' | 'feed' | 'suggestions'>('search');
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [loadingData, setLoadingData] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bagreScore, setBagreScore] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    position: '',
    minScore: 0,
    location: ''
  });
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
      loadUserProfile();
      loadBagreScore();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const loadBagreScore = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('player_evaluations')
        .select('defesa, velocidade, passe, chute, drible')
        .eq('avaliado_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const totalEvaluations = data.length;
        const sumDefesa = data.reduce((sum: number, e: any) => sum + (e.defesa || 0), 0);
        const sumVelocidade = data.reduce((sum: number, e: any) => sum + (e.velocidade || 0), 0);
        const sumPasse = data.reduce((sum: number, e: any) => sum + (e.passe || 0), 0);
        const sumChute = data.reduce((sum: number, e: any) => sum + (e.chute || 0), 0);
        const sumDrible = data.reduce((sum: number, e: any) => sum + (e.drible || 0), 0);

        const averageScore = (sumDefesa + sumVelocidade + sumPasse + sumChute + sumDrible) / (totalEvaluations * 5);
        setBagreScore(Math.round(averageScore * 10) / 10);
      }
    } catch (error) {
      console.error("Erro ao calcular BagreScore:", error);
    }
  };

  const loadRecentActivities = async () => {
    if (!user?.id) return;

    setLoadingData(true);
    try {
      // Buscar eventos criados por pessoas que você segue nos últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const followingIds = following.map(f => f.following_id);
      
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles!events_user_id_fkey(nome, avatar_url)')
        .in('user_id', followingIds)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadSuggestions = async () => {
    if (!user?.id) return;

    setLoadingData(true);
    try {
      // Buscar jogadores com a mesma posição ou que participaram dos mesmos eventos
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;

      // Filtrar os que você já segue
      const followingIds = following.map(f => f.following_id);
      const filtered = (data || []).filter((p: any) => !followingIds.includes(p.id));

      setSuggestions(filtered);
    } catch (error) {
      console.error("Erro ao carregar sugestões:", error);
    } finally {
      setLoadingData(false);
    }
  };

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

  const handleTabChange = (tab: 'search' | 'followers' | 'following' | 'feed' | 'suggestions') => {
    setActiveTab(tab);

    if (tab === 'followers' && followers.length === 0) {
      loadFollowers();
    } else if (tab === 'following' && following.length === 0) {
      loadFollowing();
    } else if (tab === 'feed' && recentActivities.length === 0) {
      loadFollowing().then(() => loadRecentActivities());
    } else if (tab === 'suggestions' && suggestions.length === 0) {
      loadFollowing().then(() => loadSuggestions());
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
      <main className="min-h-screen pt-24 pb-12 px-4 bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="mx-auto max-w-6xl">
          
          {/* Header Rico com Perfil do Usuário */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-3xl shadow-2xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white p-1 shadow-xl">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.nome}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                      {userProfile?.nome?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {bagreScore !== null && bagreScore >= 4.0 && (
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full p-2 shadow-lg">
                    <span className="text-xl">🏆</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {userProfile?.nome || user?.email}
                </h1>
                <div className="flex items-center gap-4 text-white/90 mb-3">
                  {userProfile?.posicao && (
                    <span className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm">
                      {getPositionEmoji(userProfile.posicao)} {userProfile.posicao}
                    </span>
                  )}
                  {bagreScore !== null && (
                    <span className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm">
                      ⭐ BagreScore: {bagreScore.toFixed(1)}
                    </span>
                  )}
                  {stats.followersCount >= 10 && (
                    <span className="flex items-center gap-2 bg-yellow-500/90 px-3 py-1 rounded-full text-sm font-semibold">
                      🔥 Atleta Popular
                    </span>
                  )}
                </div>
                {userProfile?.bio && (
                  <p className="text-white/80 text-sm max-w-2xl">
                    {userProfile.bio}
                  </p>
                )}
              </div>

              {/* Toggle View Mode */}
              <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-green-600 shadow-lg' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  📋
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white text-green-600 shadow-lg' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  ▦
                </button>
              </div>
            </div>
          </div>

          {/* Stats Avançados */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.followersCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Seguidores</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
                  <span className="text-2xl">❤️</span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.followingCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Seguindo</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {bagreScore !== null ? bagreScore.toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">BagreScore</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Modernizadas */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              {[
                { id: 'search', label: 'Buscar', icon: '🔍' },
                { id: 'followers', label: 'Seguidores', icon: '👥', badge: stats.followersCount },
                { id: 'following', label: 'Seguindo', icon: '❤️', badge: stats.followingCount },
                { id: 'feed', label: 'Atividades', icon: '📰' },
                { id: 'suggestions', label: 'Sugestões', icon: '✨' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`relative flex-1 min-w-[120px] py-4 px-4 text-center font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-blue-500"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Conteúdo das tabs */}
            <div className="p-6 min-h-[500px]">
              {activeTab === 'search' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      🔍 Encontre Novos Jogadores
                    </h2>
                    
                    {/* Filtros Avançados */}
                    <div className="grid md:grid-cols-3 gap-4 mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Posição
                        </label>
                        <select
                          value={searchFilters.position}
                          onChange={(e) => setSearchFilters({...searchFilters, position: e.target.value})}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Todas as posições</option>
                          <option value="goleiro">🧤 Goleiro</option>
                          <option value="zagueiro">🛡️ Zagueiro</option>
                          <option value="lateral">➡️ Lateral</option>
                          <option value="volante">⚙️ Volante</option>
                          <option value="meia">🎯 Meia</option>
                          <option value="atacante">⚡ Atacante</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          BagreScore Mínimo
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={searchFilters.minScore}
                          onChange={(e) => setSearchFilters({...searchFilters, minScore: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Localização
                        </label>
                        <input
                          type="text"
                          placeholder="Cidade..."
                          value={searchFilters.location}
                          onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <UserSearch
                    placeholder="Buscar jogadores por nome ou ID..."
                    maxResults={20}
                  />
                </div>
              )}

              {activeTab === 'followers' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    👥 Seus Seguidores ({stats.followersCount})
                  </h2>
                  
                  {loadingData ? (
                    <div className="grid gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-24"></div>
                      ))}
                    </div>
                  ) : followers.length > 0 ? (
                    <div className={viewMode === 'grid' 
                      ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' 
                      : 'space-y-4'
                    }>
                      {followers.map((item) => (
                        <div 
                          key={item.id} 
                          className={`group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-green-400 ${
                            viewMode === 'grid' ? 'p-6' : 'p-4 flex items-center justify-between'
                          }`}
                        >
                          <div className={`flex items-center ${viewMode === 'grid' ? 'flex-col text-center' : 'gap-4'}`}>
                            <div className="relative">
                              <div className={`${viewMode === 'grid' ? 'w-20 h-20 mb-3' : 'w-16 h-16'} rounded-full bg-gradient-to-br from-green-400 to-blue-500 p-1 shadow-lg`}>
                                {item.follower_profile.avatar_url ? (
                                  <img
                                    src={item.follower_profile.avatar_url}
                                    alt={item.follower_profile.nome}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                                    {item.follower_profile.nome.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 shadow-lg">
                                <span className="text-xs">✓</span>
                              </div>
                            </div>
                            
                            <div className={viewMode === 'grid' ? '' : 'flex-1'}>
                              <div
                                className="font-bold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                onClick={() => openProfileModal(item.follower_id, item.follower_profile.nome)}
                              >
                                {item.follower_profile.nome}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {item.follower_profile.posicao && (
                                  <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full mr-2">
                                    {getPositionEmoji(item.follower_profile.posicao)} {item.follower_profile.posicao}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                👤 Seguindo desde {formatDate(item.created_at)}
                              </div>
                            </div>
                          </div>
                          
                          {viewMode === 'list' && (
                            <FollowButton
                              targetUserId={item.follower_id}
                              targetUserName={item.follower_profile.nome}
                              size="sm"
                              variant="secondary"
                            />
                          )}
                          {viewMode === 'grid' && (
                            <div className="mt-4 w-full">
                              <FollowButton
                                targetUserId={item.follower_id}
                                targetUserName={item.follower_profile.nome}
                                size="sm"
                                variant="secondary"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div className="text-6xl mb-4">😢</div>
                      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Você ainda não tem seguidores
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Participe de eventos e conecte-se com outros jogadores!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'following' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    ❤️ Jogadores que Você Segue ({stats.followingCount})
                  </h2>
                  
                  {loadingData ? (
                    <div className="grid gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-24"></div>
                      ))}
                    </div>
                  ) : following.length > 0 ? (
                    <div className={viewMode === 'grid' 
                      ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' 
                      : 'space-y-4'
                    }>
                      {following.map((item) => (
                        <div 
                          key={item.id} 
                          className={`group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-blue-400 ${
                            viewMode === 'grid' ? 'p-6' : 'p-4 flex items-center justify-between'
                          }`}
                        >
                          <div className={`flex items-center ${viewMode === 'grid' ? 'flex-col text-center' : 'gap-4'}`}>
                            <div className="relative">
                              <div className={`${viewMode === 'grid' ? 'w-20 h-20 mb-3' : 'w-16 h-16'} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-1 shadow-lg`}>
                                {item.following_profile.avatar_url ? (
                                  <img
                                    src={item.following_profile.avatar_url}
                                    alt={item.following_profile.nome}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                                    {item.following_profile.nome.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1.5 shadow-lg">
                                <span className="text-xs">❤️</span>
                              </div>
                            </div>
                            
                            <div className={viewMode === 'grid' ? '' : 'flex-1'}>
                              <div
                                className="font-bold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                onClick={() => openProfileModal(item.following_id, item.following_profile.nome)}
                              >
                                {item.following_profile.nome}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {item.following_profile.posicao && (
                                  <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full mr-2">
                                    {getPositionEmoji(item.following_profile.posicao)} {item.following_profile.posicao}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                ❤️ Seguindo desde {formatDate(item.created_at)}
                              </div>
                            </div>
                          </div>
                          
                          {viewMode === 'list' && (
                            <FollowButton
                              targetUserId={item.following_id}
                              targetUserName={item.following_profile.nome}
                              size="sm"
                              variant="secondary"
                            />
                          )}
                          {viewMode === 'grid' && (
                            <div className="mt-4 w-full">
                              <FollowButton
                                targetUserId={item.following_id}
                                targetUserName={item.following_profile.nome}
                                size="sm"
                                variant="secondary"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Você ainda não segue ninguém
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Use a aba "Buscar" para encontrar jogadores!
                      </p>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="mt-4 px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        🔍 Buscar Jogadores
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nova Aba: Feed de Atividades */}
              {activeTab === 'feed' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    📰 Feed de Atividades
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      Últimos 7 dias
                    </span>
                  </h2>
                  
                  {loadingData ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-32"></div>
                      ))}
                    </div>
                  ) : recentActivities.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivities.map((activity: any, index) => (
                        <div 
                          key={index}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-l-4 border-green-500"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 p-1 flex-shrink-0">
                              {activity.profiles?.avatar_url ? (
                                <img
                                  src={activity.profiles.avatar_url}
                                  alt={activity.profiles.nome}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                                  {activity.profiles?.nome?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {activity.profiles?.nome}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">criou um evento</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  • {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              
                              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                      ⚽ {activity.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      📍 {activity.location || 'Local não informado'}
                                    </p>
                                    {activity.date && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        📅 {new Date(activity.date).toLocaleDateString('pt-BR')}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => router.push('/dashboard')}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all text-sm font-medium"
                                  >
                                    Ver Evento
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div className="text-6xl mb-4">📭</div>
                      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Nenhuma atividade recente
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Siga mais jogadores para ver as atividades deles aqui!
                      </p>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="mt-4 px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        🔍 Buscar Jogadores
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nova Aba: Sugestões Inteligentes */}
              {activeTab === 'suggestions' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    ✨ Sugestões para Você
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Jogadores que você pode conhecer baseado em eventos em comum e preferências
                  </p>
                  
                  {loadingData ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-48"></div>
                      ))}
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {suggestions.map((suggestion: any) => (
                        <div 
                          key={suggestion.id}
                          className="group bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 p-6 border-2 border-transparent hover:border-purple-400"
                        >
                          <div className="flex flex-col items-center text-center">
                            <div className="relative mb-4">
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 p-1 shadow-xl">
                                {suggestion.avatar_url ? (
                                  <img
                                    src={suggestion.avatar_url}
                                    alt={suggestion.nome}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-2xl">
                                    {suggestion.nome.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-2 shadow-lg animate-pulse">
                                <span className="text-sm">✨</span>
                              </div>
                            </div>
                            
                            <div
                              className="font-bold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-2"
                              onClick={() => openProfileModal(suggestion.id, suggestion.nome)}
                            >
                              {suggestion.nome}
                            </div>
                            
                            {suggestion.posicao && (
                              <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm mb-3">
                                {getPositionEmoji(suggestion.posicao)} {suggestion.posicao}
                              </span>
                            )}
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                              💡 Sugestão baseada em eventos em comum
                            </div>
                            
                            <FollowButton
                              targetUserId={suggestion.id}
                              targetUserName={suggestion.nome}
                              size="sm"
                              variant="primary"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div className="text-6xl mb-4">🎯</div>
                      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Sem sugestões no momento
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Participe de mais eventos para receber sugestões personalizadas!
                      </p>
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        ⚽ Ver Eventos
                      </button>
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