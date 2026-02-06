"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FloatingNotificationButton from "../components/FloatingNotificationButton";
import CreateEventModal from "../components/CreateEventModal";
import EventAnalyticsModal from "../components/EventAnalyticsModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import EventRegistrationModal from "../components/EventRegistrationModal";
import PaymentModal from "../components/PaymentModal";
import PresenceButtons from "../components/PresenceButtons";
import ParticipantsListModal from "../components/ParticipantsListModal";
import EventPaymentsPanel from "../components/EventPaymentsPanel";
import GameDayModal from "../components/GameDayModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Event, Profile } from "@/types/database.types";
import { 
  getCurrentLocation, 
  calculateDistance, 
  formatDistance, 
  RADIUS_OPTIONS, 
  type Coordinates,
  type RadiusValue 
} from "@/lib/geolocation";
import { formatarData, gerarDatasRecorrenciaMensal, eventoPassou } from "@/lib/dateUtils";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'nearby' | 'my-events' | 'registrations'>('overview');
  const [searchTerm, setSearchTerm] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<Event[]>([]);
  const [loadingGlobalSearch, setLoadingGlobalSearch] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "view" | "edit">("create");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Estados para eventos próximos
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<RadiusValue>(15);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showNearbyEvents, setShowNearbyEvents] = useState(false);
  
  // Estados para inscrição em eventos
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [eventToRegister, setEventToRegister] = useState<Event | null>(null);
  const [userParticipations, setUserParticipations] = useState<Map<string, any>>(new Map());
  const [myRegisteredEvents, setMyRegisteredEvents] = useState<Event[]>([]);
  const [loadingRegisteredEvents, setLoadingRegisteredEvents] = useState(false);
  
  // Estados para sistema de pagamento
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [paymentsAdminOpen, setPaymentsAdminOpen] = useState(false);
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [creatorProfiles, setCreatorProfiles] = useState<Map<string, Profile>>(new Map());
  
  // Estados para dia do jogo
  const [gameDayModalOpen, setGameDayModalOpen] = useState(false);
  const [selectedEventForGameDay, setSelectedEventForGameDay] = useState<Event | null>(null);
  const [bagreScore, setBagreScore] = useState<number | null>(null);
  const [loadingBagreScore, setLoadingBagreScore] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Carregar eventos criados pelo usuário
  const loadMyEvents = async () => {
    if (!user) return;
    
    try {
      setLoadingEvents(true);
      console.log("🔍 Carregando eventos do usuário:", user.id);
      
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("criador_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ Erro ao carregar eventos:", error);
        throw error;
      }
      
      console.log("✅ Eventos carregados:", data?.length || 0);
      setMyEvents(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar eventos:", error.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyEvents();
      loadUserParticipations();
      loadMyRegisteredEvents();
      loadBagreScore();
      // Carregar eventos próximos automaticamente ao montar o componente
      handleGetLocation();
    }
  }, [user]);

  // Carregar eventos próximos quando localização ou raio mudar
  useEffect(() => {
    if (userLocation) {
      loadNearbyEvents();
    }
  }, [userLocation, selectedRadius]);

  // Carregar perfis dos criadores quando eventos mudarem
  useEffect(() => {
    loadCreatorProfiles();
  }, [nearbyEvents]);

  // Função para calcular BagreScore (média das avaliações recebidas)
  const loadBagreScore = async () => {
    if (!user) return;

    try {
      setLoadingBagreScore(true);
      
      // Buscar todas as avaliações recebidas pelo usuário
      const { data, error } = await supabase
        .from('player_evaluations')
        .select('defesa, velocidade, passe, chute, drible')
        .eq('avaliado_id', user.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        setBagreScore(null);
        return;
      }

      // Calcular média geral de todas as habilidades
      const totalEvaluations = data.length;
      const sumDefesa = data.reduce((sum: number, e: any) => sum + (e.defesa || 0), 0);
      const sumVelocidade = data.reduce((sum: number, e: any) => sum + (e.velocidade || 0), 0);
      const sumPasse = data.reduce((sum: number, e: any) => sum + (e.passe || 0), 0);
      const sumChute = data.reduce((sum: number, e: any) => sum + (e.chute || 0), 0);
      const sumDrible = data.reduce((sum: number, e: any) => sum + (e.drible || 0), 0);

      const averageScore = (sumDefesa + sumVelocidade + sumPasse + sumChute + sumDrible) / (totalEvaluations * 5);
      
      setBagreScore(Math.round(averageScore * 10) / 10); // Arredondar para 1 casa decimal
    } catch (error) {
      console.error('Erro ao calcular BagreScore:', error);
      setBagreScore(null);
    } finally {
      setLoadingBagreScore(false);
    }
  };

  const loadCreatorProfiles = async (events?: Event[]) => {
    try {
      const allEvents = events || nearbyEvents;
      const creatorIds = [...new Set(allEvents.map(e => e.criador_id))];
      if (creatorIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', creatorIds);

      if (error) throw error;

      const profilesMap = new Map(creatorProfiles); // Preserve existing profiles
      data?.forEach((p: any) => {
        profilesMap.set(p.id, p as Profile);
      });
      setCreatorProfiles(profilesMap);
    } catch (error) {
      console.error('Erro ao carregar perfis dos criadores:', error);
    }
  };

  const loadUserParticipations = async () => {
    if (!user) return;

    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('event_participants')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao carregar participações:', error);
        return;
      }

      const participationsMap = new Map();
      data?.forEach((p: any) => {
        participationsMap.set(p.event_id, p);
      });
      setUserParticipations(participationsMap);
    } catch (error) {
      console.error('Erro ao carregar participações:', error);
    }
  };

  // Carregar eventos em que o usuário está inscrito
  const loadMyRegisteredEvents = async () => {
    if (!user) return;

    setLoadingRegisteredEvents(true);
    try {
      // Buscar IDs dos eventos em que o usuário está inscrito
      // @ts-ignore
      const { data: participations, error: participationsError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id);

      if (participationsError) {
        console.error('Erro ao carregar participações:', participationsError);
        return;
      }

      if (!participations || participations.length === 0) {
        setMyRegisteredEvents([]);
        return;
      }

      const eventIds = participations.map((p: any) => p.event_id);

      // Buscar os eventos completos
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (eventsError) {
        console.error('Erro ao carregar eventos inscritos:', eventsError);
        return;
      }

      setMyRegisteredEvents(events || []);

      // Carregar perfis dos criadores desses eventos
      const creatorIds = [...new Set((events || []).map((e: any) => e.criador_id))];
      if (creatorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', creatorIds);

        if (!profilesError && profiles) {
          const profilesMap = new Map(creatorProfiles);
          profiles.forEach((p: any) => {
            profilesMap.set(p.id, p as Profile);
          });
          setCreatorProfiles(profilesMap);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar eventos inscritos:', error);
    } finally {
      setLoadingRegisteredEvents(false);
    }
  };

  // Função para solicitar localização do usuário
  const handleGetLocation = async () => {
    setLoadingLocation(true);
    setLocationError(null);

    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setShowNearbyEvents(true);
      console.log("📍 Localização obtida:", location);
    } catch (error: any) {
      console.error("❌ Erro ao obter localização:", error);
      setLocationError(error.message);
      setUserLocation(null);
      setShowNearbyEvents(false);
    } finally {
      setLoadingLocation(false);
    }
  };

  // Função para carregar eventos próximos
  const loadNearbyEvents = async () => {
    if (!userLocation) return;

    try {
      console.log("🔍 Buscando eventos próximos...");
      
      // Buscar todos os eventos públicos (exceto os criados pelo usuário)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .neq("criador_id", user?.id || "")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erro ao carregar eventos:", error);
        throw error;
      }

      // Filtrar eventos dentro do raio selecionado
      const eventsWithDistance = (data || [])
        .map((event: any) => {
          const distance = calculateDistance(
            userLocation,
            { latitude: event.latitude!, longitude: event.longitude! }
          );
          return { ...event, distance };
        })
        .filter((event: any) => event.distance <= selectedRadius)
        .sort((a: any, b: any) => a.distance - b.distance);

      console.log(`✅ Encontrados ${eventsWithDistance.length} eventos dentro de ${selectedRadius}km`);
      setNearbyEvents(eventsWithDistance);
    } catch (error: any) {
      console.error("Erro ao buscar eventos próximos:", error.message);
    }
  };

  // Busca global de eventos
  const searchAllEvents = async (term: string) => {
    if (!term || term.trim() === '') {
      setGlobalSearchResults([]);
      return;
    }

    try {
      setLoadingGlobalSearch(true);
      console.log('🔍 Buscando eventos globalmente:', term);

      // Verificar se o termo parece ser um UUID válido
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
      
      // Buscar por título, local, descrição e ID (só se for UUID)
      let query = supabase
        .from('events')
        .select('*');
      
      if (isUUID) {
        query = query.or(`titulo.ilike.%${term}%,id.eq.${term},local.ilike.%${term}%,descricao.ilike.%${term}%`);
      } else {
        query = query.or(`titulo.ilike.%${term}%,local.ilike.%${term}%,descricao.ilike.%${term}%`);
      }
      
      const { data, error } = await query
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro na busca global:', error);
        throw error;
      }

      console.log('✅ Eventos encontrados:', data?.length || 0);
      setGlobalSearchResults(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar eventos:', error.message);
      setGlobalSearchResults([]);
    } finally {
      setLoadingGlobalSearch(false);
    }
  };

  // Effect para busca global
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm) {
        searchAllEvents(searchTerm);
      } else {
        setGlobalSearchResults([]);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Carregar perfis dos criadores dos eventos da busca global
  useEffect(() => {
    if (globalSearchResults.length > 0) {
      loadCreatorProfiles(globalSearchResults);
    }
  }, [globalSearchResults]);

  // Filtrar eventos com base na busca (incluindo eventos próximos e inscritos)
  const filteredEvents = myEvents.filter((event) => {
    const matchesSearch = searchTerm === '' || 
      event.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.id.toString().includes(searchTerm);
    return matchesSearch;
  });

  const filteredNearbyEvents = nearbyEvents.filter((event) => {
    const matchesSearch = searchTerm === '' || 
      event.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.id.toString().includes(searchTerm);
    return matchesSearch;
  });

  const filteredRegisteredEvents = myRegisteredEvents.filter((event) => {
    const matchesSearch = searchTerm === '' || 
      event.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.id.toString().includes(searchTerm);
    return matchesSearch;
  });  const handleCreateEvent = () => {
    setModalMode("create");
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleViewEvent = (event: Event) => {
    setModalMode("view");
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setModalMode("edit");
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleViewAnalytics = (event: Event) => {
    setSelectedEvent(event);
    setIsAnalyticsOpen(true);
  };

    const handleDeleteEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;

    setDeletingEvent(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id);

      if (error) {
        console.error('Erro ao excluir evento:', error);
        alert('Erro ao excluir evento. Tente novamente.');
        return;
      }

      // Remove o evento da lista local
      setMyEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setIsDeleteModalOpen(false);
      setSelectedEvent(null);
      alert('Evento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      alert('Erro ao excluir evento. Tente novamente.');
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleRegisterForEvent = (event: Event) => {
    setEventToRegister(event);
    setIsRegistrationModalOpen(true);
  };

  const confirmRegistration = async () => {
    if (!eventToRegister || !user || !profile) return;

    try {
      console.log("📝 Inscrevendo usuário no evento...");
      
      // Verificar se já está inscrito
      // @ts-ignore
      const { data: existingRegistration, error: checkError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventToRegister.id)
        .eq('user_id', user.id)
        .single();

      if (existingRegistration) {
        alert('Você já está inscrito neste evento!');
        setIsRegistrationModalOpen(false);
        return;
      }

      // Inserir participante com status 'pendente' (aguardando pagamento)
      // @ts-ignore - Supabase type inference issue
      const { error: insertError } = await supabase
        .from('event_participants')
        // @ts-ignore
        .insert({
          event_id: eventToRegister.id,
          user_id: user.id,
          status: 'pendente' // Inicia como pendente, muda para confirmado após pagamento
        });

      if (insertError) {
        console.error('Erro ao se inscrever:', insertError);
        alert('Erro ao se inscrever no evento. Tente novamente.');
        return;
      }

      alert('✅ Inscrição realizada com sucesso! Status: TALVEZ (aguardando pagamento)');
      setIsRegistrationModalOpen(false);
      setEventToRegister(null);
      
      // Recarregar participações e eventos inscritos
      loadUserParticipations();
      loadMyRegisteredEvents();
      if (userLocation) {
        loadNearbyEvents();
      }
    } catch (error) {
      console.error('Erro ao se inscrever:', error);
      alert('Erro ao se inscrever no evento. Tente novamente.');
    }
  };

  const handleCancelRegistration = async (event: Event) => {
    if (!user) return;
    
    if (!confirm(`Deseja realmente cancelar sua inscrição no evento "${event.titulo}"?`)) {
      return;
    }

    try {
      // @ts-ignore
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao cancelar inscrição:', error);
        alert('Erro ao cancelar inscrição. Tente novamente.');
        return;
      }

      alert('✅ Inscrição cancelada com sucesso!');
      
      // Recarregar participações e eventos inscritos
      await loadUserParticipations();
      await loadMyRegisteredEvents();
      if (userLocation) {
        await loadNearbyEvents();
      }
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      alert('Erro ao cancelar inscrição. Tente novamente.');
    }
  };

  const handleOpenPaymentModal = (event: Event) => {
    setSelectedEventForPayment(event);
    setPaymentModalOpen(true);
  };

  const handleOpenParticipantsModal = (event: Event) => {
    setSelectedEventForPayment(event);
    setParticipantsModalOpen(true);
  };

  const handleOpenPaymentsAdminPanel = (event: Event) => {
    setSelectedEventForPayment(event);
    setPaymentsAdminOpen(true);
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
      <FloatingNotificationButton userId={user.id} />
      <main className="min-h-screen pt-24 pb-12 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl">
          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Visão Geral
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Bem-vindo de volta, <span className="font-semibold text-green-600">{profile?.nome}</span>!
            </p>
          </div>

          {/* Cards de Resumo */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <button
              onClick={() => setActiveTab('nearby')}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <span className="text-2xl">📍</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Eventos Próximos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{nearbyEvents.length}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('my-events')}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <span className="text-2xl">⚽</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Meus Eventos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{myEvents.length}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('registrations')}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <span className="text-2xl">🎫</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Inscrições</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{myRegisteredEvents.length}</p>
                </div>
              </div>
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">BagreScore</p>
                  {loadingBagreScore ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ) : bagreScore !== null ? (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{bagreScore.toFixed(1)} ⭐</p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sem avaliações</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 mb-8">
            <div className="flex overflow-x-auto gap-1 scrollbar-hide">
              <button
                onClick={() => setActiveTab('overview')}
                className={`min-w-fit flex-1 px-3 sm:px-6 py-3 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                🔎 <span className="hidden sm:inline">Buscar </span>Evento
              </button>
              <button
                onClick={() => setActiveTab('nearby')}
                className={`min-w-fit flex-1 px-3 sm:px-6 py-3 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'nearby'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                📍 <span className="hidden sm:inline">Eventos </span>Próximos
              </button>
              <button
                onClick={() => setActiveTab('my-events')}
                className={`min-w-fit flex-1 px-3 sm:px-6 py-3 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'my-events'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                ⚽ <span className="hidden sm:inline">Meus </span>Eventos
              </button>
              <button
                onClick={() => setActiveTab('registrations')}
                className={`min-w-fit flex-1 px-3 sm:px-6 py-3 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'registrations'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                🎫 <span className="hidden sm:inline">Minhas </span>Inscrições
              </button>
            </div>
          </div>

          {/* Botão Criar Evento */}
          <div className="mb-8 flex justify-end">
            <button
              onClick={() => router.push('/dashboard/events/new')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 shadow-lg"
            >
              <span>+</span>
              Criar Evento
            </button>
          </div>

          {/* Conteúdo das Abas */}
          {activeTab === 'overview' && (
            <>
              {/* Busca Global */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🔍 Buscar Todos os Eventos
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite o título, ID ou local do evento..."
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                    🔎
                  </span>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <div className="mt-2">
                    {loadingGlobalSearch ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        🔍 Buscando eventos...
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {globalSearchResults.length} evento(s) encontrado(s)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Resultados da Busca Global */}
              {searchTerm && globalSearchResults.length > 0 && (
                <section className="mb-8">
                  <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-lg p-6 text-white mb-4">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                      🔍 Resultados da Busca
                    </h2>
                    <p className="text-green-100 text-sm">
                      Encontramos {globalSearchResults.length} evento(s) para "{searchTerm}"
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {globalSearchResults.map((event: Event) => {
                      const participation = userParticipations.get(event.id);
                      const creatorProfile = creatorProfiles.get(event.criador_id);
                      const isCreator = event.criador_id === user?.id;
                      
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          onView={() => handleViewEvent(event)}
                          onEdit={isCreator ? () => handleEditEvent(event) : undefined}
                          onAnalytics={isCreator ? () => handleViewAnalytics(event) : undefined}
                          onDelete={isCreator ? () => handleDeleteEvent(event) : undefined}
                          onRegister={!isCreator && !participation ? () => handleRegisterForEvent(event) : undefined}
                          onCancelRegistration={!isCreator && participation ? () => handleCancelRegistration(event) : undefined}
                          onPayment={!isCreator && participation ? () => handleOpenPaymentModal(event) : undefined}
                          onViewParticipants={() => handleOpenParticipantsModal(event)}
                          onGameDay={isCreator ? () => {
                            setSelectedEventForGameDay(event);
                            setGameDayModalOpen(true);
                          } : undefined}
                          showDistance={true}
                          isRegistered={!!participation}
                          registrationStatus={participation?.status}
                          participation={participation}
                          currentUserId={user?.id}
                          creatorProfile={creatorProfile}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {activeTab === 'nearby' && (
            <>
              {/* Eventos Próximos a Mim */}
              <section>
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        📍 Eventos Próximos a Mim
                      </h2>
                      <p className="text-blue-100 text-sm">
                        Descubra eventos de futebol acontecendo perto de você
                      </p>
                    </div>
                    
                    {!userLocation ? (
                      <button
                        onClick={handleGetLocation}
                        disabled={loadingLocation}
                        className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center whitespace-nowrap"
                      >
                        {loadingLocation ? (
                        <>
                          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          Obtendo...
                        </>
                      ) : (
                        <>
                          🎯 Encontrar Eventos
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={selectedRadius}
                        onChange={(e) => setSelectedRadius(Number(e.target.value) as RadiusValue)}
                        className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold focus:ring-2 focus:ring-blue-300"
                      >
                        {RADIUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            📏 {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setUserLocation(null);
                          setShowNearbyEvents(false);
                          setNearbyEvents([]);
                        }}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors"
                      >
                        ✕ Limpar
                      </button>
                    </div>
                  )}
                </div>

                {locationError && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-300 rounded-lg">
                    <p className="text-sm">⚠️ {locationError}</p>
                  </div>
                )}
              </div>

              {showNearbyEvents && (
                <>
                  {filteredNearbyEvents.length > 0 ? (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          🎯 Encontramos <span className="font-bold text-green-600">{filteredNearbyEvents.length}</span> evento(s) em um raio de <span className="font-bold">{selectedRadius}km</span>
                        </p>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNearbyEvents.map((event: any) => {
                          const participation = userParticipations.get(event.id);
                          const creatorProfile = creatorProfiles.get(event.criador_id);
                          return (
                            <EventCard
                              key={event.id}
                              event={event}
                              onView={() => handleViewEvent(event)}
                              onRegister={() => handleRegisterForEvent(event)}
                              onCancelRegistration={() => handleCancelRegistration(event)}
                              onPayment={() => handleOpenPaymentModal(event)}
                              onViewParticipants={() => handleOpenParticipantsModal(event)}
                              showDistance={true}
                              distance={event.distance}
                              isRegistered={!!participation}
                              registrationStatus={participation?.status}
                              participation={participation}
                              currentUserId={user?.id}
                              creatorProfile={creatorProfile}
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="text-5xl mb-4">🗺️</div>
                        <p className="text-lg mb-2">Nenhum evento encontrado por perto</p>
                        <p className="text-sm">
                          Tente aumentar o raio de busca ou criar um novo evento na sua região!
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Meus Eventos Inscritos */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🎫 Meus Eventos Inscritos
                </h2>
              </div>
              
              {loadingRegisteredEvents ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-lg">Carregando seus eventos inscritos...</p>
                  </div>
                </div>
              ) : filteredRegisteredEvents.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-5xl mb-4">🎫</div>
                    <p className="text-lg mb-2">Você ainda não está inscrito em nenhum evento</p>
                    <p className="text-sm">Use "Eventos Próximos a Mim" para encontrar e se inscrever!</p>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRegisteredEvents.map((event: any) => {
                    const participation = userParticipations.get(event.id);
                    const creatorProfile = creatorProfiles.get(event.criador_id);
                    const isCreator = event.criador_id === user?.id;
                    return (
                      <EventCard
                        key={event.id}
                        event={event}
                        onView={() => handleViewEvent(event)}
                        onEdit={isCreator ? () => handleEditEvent(event) : undefined}
                        onAnalytics={isCreator ? () => handleViewAnalytics(event) : undefined}
                        onDelete={isCreator ? () => handleDeleteEvent(event) : undefined}
                        onRegister={!isCreator ? () => handleRegisterForEvent(event) : undefined}
                        onCancelRegistration={!isCreator ? () => handleCancelRegistration(event) : undefined}
                        onPayment={!isCreator ? () => handleOpenPaymentModal(event) : undefined}
                        onViewParticipants={() => handleOpenParticipantsModal(event)}
                        showDistance={false}
                        isRegistered={!isCreator}
                        registrationStatus={participation?.status}
                        participation={participation}
                        currentUserId={user?.id}
                        creatorProfile={creatorProfile}
                      />
                    );
                  })}
                </div>
              )}
            </section>
            </>
          )}

          {activeTab === 'my-events' && (
            <>
              {/* Meus Eventos Criados */}
              <section>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    ⚽ Meus Eventos Criados
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Gerencie os eventos que você organizou
                  </p>
                </div>
              
              {loadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCard 
                      key={event.id} 
                      event={event}
                      onView={() => handleViewEvent(event)}
                      onEdit={() => handleEditEvent(event)}
                      onAnalytics={() => handleViewAnalytics(event)}
                      onDelete={() => handleDeleteEvent(event)}
                      onGameDay={() => {
                        setSelectedEventForGameDay(event);
                        setGameDayModalOpen(true);
                      }}
                      onViewParticipants={() => handleOpenParticipantsModal(event)}
                    />
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-lg mb-2">Nenhum evento encontrado</p>
                    <p className="text-sm mb-4">
                      Não encontramos eventos com "{searchTerm}"
                    </p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                    >
                      Limpar Busca
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-5xl mb-4">⚽</div>
                    <p className="text-lg mb-2">Você ainda não criou nenhum evento</p>
                    <p className="text-sm mb-4">Clique em "Criar Evento" para começar!</p>
                  </div>
                </div>
              )}
            </section>
            </>
          )}

          {activeTab === 'registrations' && (
            <>
              {/* Meus Eventos Inscritos */}
              <section>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    🎫 Meus Eventos Inscritos
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Eventos nos quais você está participando
                  </p>
                </div>

              {loadingRegisteredEvents ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-lg">Carregando seus eventos...</p>
                  </div>
                </div>
              ) : myRegisteredEvents.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      🎾 Você está inscrito em <span className="font-bold text-green-600">{myRegisteredEvents.length}</span> evento(s)
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myRegisteredEvents.flatMap((event: any) => {
                      const participation = userParticipations.get(event.id);
                      const creatorProfile = creatorProfiles.get(event.criador_id);
                      
                      // Para eventos mensais, gerar múltiplas datas
                      if (event.recorrencia === "mensal" && event.data_inicio && event.data_fim) {
                        const datasRecorrencia = gerarDatasRecorrenciaMensal(event.data_inicio, event.data_fim);
                        return datasRecorrencia
                          .filter(data => !eventoPassou(data)) // Só mostrar futuras
                          .map(data => ({
                            ...event,
                            dataEspecifica: data,
                            tituloOriginal: event.titulo,
                            titulo: `${event.titulo} - ${formatarData(data)}`
                          }));
                      } else {
                        // Evento único
                        const dataEvento = event.data_evento;
                        if (dataEvento && !eventoPassou(dataEvento)) {
                          return [{
                            ...event,
                            dataEspecifica: dataEvento,
                            tituloOriginal: event.titulo
                          }];
                        }
                        return [];
                      }
                    }).map((eventItem: any) => (
                      <EventCard
                        key={`${eventItem.id}-${eventItem.dataEspecifica}`}
                        event={eventItem}
                        onView={() => handleViewEvent(eventItem)}
                        onRegister={() => handleRegisterForEvent(eventItem)}
                        onCancelRegistration={() => handleCancelRegistration(eventItem)}
                        onPayment={() => handleOpenPaymentModal(eventItem)}
                        onViewParticipants={() => handleOpenParticipantsModal(eventItem)}
                        showDistance={false}
                        isRegistered={true}
                        registrationStatus={userParticipations.get(eventItem.id)?.status}
                        participation={userParticipations.get(eventItem.id)}
                        currentUserId={user?.id}
                        creatorProfile={creatorProfiles.get(eventItem.criador_id)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-5xl mb-4">📅</div>
                    <p className="text-lg mb-2">Nenhum evento próximo</p>
                    <p className="text-sm">
                      Você ainda não se inscreveu em nenhum evento futuro. Explore os eventos disponíveis!
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Histórico */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                📜 Histórico de Eventos
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-5xl mb-4">🏆</div>
                  <p className="text-lg mb-2">Nenhum evento passado ainda</p>
                  <p className="text-sm">Participe de eventos para ver seu histórico aqui!</p>
                </div>
              </div>
            </section>
            </>
          )}
        </div>
      </main>
      <Footer />
      
      {/* Modal de Criar/Editar/Visualizar Evento */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        eventData={selectedEvent}
        onEventCreated={() => {
          loadMyEvents(); // Recarregar lista de eventos
          console.log("Evento salvo com sucesso!");
        }}
      />

      {/* Modal de Analytics */}
      {selectedEvent && (
        <EventAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          event={selectedEvent}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedEvent(null);
        }}
        onConfirm={confirmDelete}
        eventTitle={selectedEvent?.titulo || ''}
        loading={deletingEvent}
      />

      {/* Modal de Inscrição */}
      {eventToRegister && (
        <EventRegistrationModal
          isOpen={isRegistrationModalOpen}
          onClose={() => {
            setIsRegistrationModalOpen(false);
            setEventToRegister(null);
          }}
          onConfirm={confirmRegistration}
          event={eventToRegister}
        />
      )}

      {/* Modal de Pagamento */}
      {paymentModalOpen && selectedEventForPayment && user && (
        (() => {
          const participation = userParticipations.get(selectedEventForPayment.id);
          const creatorProfile = creatorProfiles.get(selectedEventForPayment.criador_id);
          
          if (!participation || !creatorProfile) return null;
          
          return (
            <PaymentModal
              isOpen={paymentModalOpen}
              onClose={() => {
                setPaymentModalOpen(false);
                setSelectedEventForPayment(null);
              }}
              event={selectedEventForPayment}
              participant={participation}
              criadorProfile={creatorProfile}
              onPaymentSubmitted={async () => {
                await loadUserParticipations();
                if (userLocation) {
                  await loadNearbyEvents();
                }
              }}
            />
          );
        })()
      )}

      {/* Modal de Participantes */}
      {participantsModalOpen && selectedEventForPayment && user && (
        <ParticipantsListModal
          isOpen={participantsModalOpen}
          onClose={() => {
            setParticipantsModalOpen(false);
            setSelectedEventForPayment(null);
          }}
          eventId={selectedEventForPayment.id}
          isAdmin={selectedEventForPayment.criador_id === user.id}
        />
      )}

      {/* Painel Admin de Pagamentos */}
      {paymentsAdminOpen && selectedEventForPayment && user && (
        <EventPaymentsPanel
          isOpen={paymentsAdminOpen}
          onClose={() => {
            setPaymentsAdminOpen(false);
            setSelectedEventForPayment(null);
          }}
          eventId={selectedEventForPayment.id}
          onPaymentUpdated={async () => {
            await loadUserParticipations();
            if (userLocation) {
              await loadNearbyEvents();
            }
          }}
        />
      )}

      {/* Modal Dia de Jogo */}
      {gameDayModalOpen && selectedEventForGameDay && (
        <GameDayModal
          isOpen={gameDayModalOpen}
          onClose={() => {
            setGameDayModalOpen(false);
            setSelectedEventForGameDay(null);
          }}
          event={selectedEventForGameDay}
          onTeamsGenerated={async () => {
            // Recarregar eventos após gerar times
            await loadMyEvents();
          }}
        />
      )}
    </>
  );
}

// Função para verificar se o evento está a 24h de começar
function isWithin24Hours(event: Event): boolean {
  const now = new Date();
  
  let eventDateTime: Date;
  
  if ((event as any).dataEspecifica) {
    // Usar data específica se disponível (para recorrências)
    const [year, month, day] = (event as any).dataEspecifica.split("-").map(Number);
    const [hour, minute] = event.horario_inicio.split(":").map(Number);
    eventDateTime = new Date(year, month - 1, day, hour, minute);
  } else if (event.recorrencia === "unico" && event.data_evento) {
    // Evento único - usar data_evento
    const [year, month, day] = event.data_evento.split("-").map(Number);
    const [hour, minute] = event.horario_inicio.split(":").map(Number);
    eventDateTime = new Date(year, month - 1, day, hour, minute);
  } else if (event.recorrencia === "mensal" && event.data_inicio) {
    // Evento mensal - usar data_inicio
    const [year, month, day] = event.data_inicio.split("-").map(Number);
    const [hour, minute] = event.horario_inicio.split(":").map(Number);
    eventDateTime = new Date(year, month - 1, day, hour, minute);
  } else {
    return false;
  }
  
  const diffMs = eventDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return diffHours > 0 && diffHours <= 24;
}

// Componente para exibir evento real
function EventCard({ 
  event, 
  onView, 
  onEdit,
  onAnalytics,
  onDelete,
  onGameDay,
  showDistance = false,
  distance,
  onRegister,
  onCancelRegistration,
  onPayment,
  onViewParticipants,
  isRegistered = false,
  registrationStatus,
  participation,
  currentUserId,
  creatorProfile
}: { 
  event: Event; 
  onView: () => void;
  onEdit?: () => void;
  onAnalytics?: () => void;
  onDelete?: () => void;
  onGameDay?: () => void;
  showDistance?: boolean;
  distance?: number;
  onRegister?: () => void;
  onCancelRegistration?: () => void;
  onPayment?: () => void;
  onViewParticipants?: () => void;
  isRegistered?: boolean;
  registrationStatus?: string;
  participation?: any;
  currentUserId?: string;
  creatorProfile?: Profile;
}) {
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const tipoLabels: Record<string, string> = {
    campo: "⚽ Campo",
    salao: "🏟️ Salão", 
    society: "👥 Society"
  };
  
  const showGameDayButton = onGameDay && isWithin24Hours(event);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border-l-4 border-green-600">
      {/* ID do Evento */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">ID:</span>
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
            {event.id.slice(0, 8)}...
          </code>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(event.id);
              alert("ID copiado!");
            }}
            className="text-gray-400 hover:text-green-600 transition-colors"
            title="Copiar ID completo"
          >
            📋
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {event.titulo}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {tipoLabels[event.tipo_futebol] || event.tipo_futebol}
          </span>
          {showDistance && distance !== undefined && (
            <div className="mt-1 flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              📍 {formatDistance(distance)}
            </div>
          )}
        </div>
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
          {event.status}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        {(event as any).dataEspecifica ? (
          // Data específica para recorrências mensais
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{formatarData((event as any).dataEspecifica)}</span>
          </div>
        ) : event.recorrencia === "mensal" && event.data_inicio && event.data_fim ? (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Mensal: {formatarData(event.data_inicio)} até {formatarData(event.data_fim)}</span>
          </div>
        ) : event.recorrencia === "unico" ? (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Evento Único</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <span>🕐</span>
          <span>{event.horario_inicio} - {event.horario_fim}</span>
        </div>
        {event.local && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>{event.local}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span>👥</span>
          <span>Até {event.max_participantes} jogadores</span>
        </div>
        {event.valor_por_pessoa > 0 && (
          <div className="flex items-center gap-2">
            <span>💰</span>
            <span>R$ {event.valor_por_pessoa.toFixed(2)}/pessoa</span>
          </div>
        )}
      </div>

      {event.descricao && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {event.descricao}
        </p>
      )}

      <div className="space-y-2">
        {showDistance ? (
          // Botões para eventos próximos (visualizar e inscrever)
          <>
            {/* Botões de Admin se o usuário for o criador */}
            {(onEdit || onAnalytics || onDelete) && (
              <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={onView}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    Ver Detalhes
                  </button>
                  {onEdit && (
                    <button 
                      onClick={onEdit}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-semibold"
                    >
                      Editar
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {onAnalytics && (
                    <button 
                      onClick={onAnalytics}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <span>📊</span>
                      Analytics
                    </button>
                  )}
                  {onViewParticipants && (
                    <button 
                      onClick={onViewParticipants}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <span>👥</span>
                      Participantes
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={onDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      title="Excluir evento"
                    >
                      <span>🗑️</span>
                    </button>
                  )}
                </div>
                
                {/* Botão DIA DE JOGO - Aparece 24h antes do evento */}
                {showGameDayButton && (
                  <button 
                    onClick={onGameDay}
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all text-sm font-bold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 animate-pulse"
                  >
                    <span className="text-xl">🏆</span>
                    DIA DE JOGO
                  </button>
                )}
              </div>
            )}

            {isRegistered ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <span className="text-xl">
                    {registrationStatus === 'confirmado' ? '✅' : '⏳'}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {registrationStatus === 'confirmado' ? 'CONFIRMADO' : 'PENDENTE (Talvez)'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {registrationStatus === 'confirmado' ? 'Pagamento realizado' : 'Aguardando pagamento'}
                    </p>
                  </div>
                </div>
                
                {/* Botão de Pagamento se status pendente e evento pago (valor > 0) */}
                {registrationStatus === 'pendente' && event.valor_por_pessoa > 0 && onPayment && (
                  <button 
                    onClick={onPayment}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <span>💳</span>
                    Pagar Evento (R$ {event.valor_por_pessoa.toFixed(2)})
                  </button>
                )}

                {/* Botões de Presença se status confirmado */}
                {registrationStatus === 'confirmado' && participation && currentUserId && (
                  <PresenceButtons
                    eventId={event.id}
                    userId={currentUserId}
                    participant={participation}
                    onStatusChange={() => {
                      // Callback vazio por enquanto
                    }}
                  />
                )}

                {/* Botão Ver Participantes */}
                {onViewParticipants && (
                  <button 
                    onClick={onViewParticipants}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <span>👥</span>
                    Ver Participantes
                  </button>
                )}

                <button 
                  onClick={onCancelRegistration}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <span>❌</span>
                  Cancelar Inscrição
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={onRegister}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>✅</span>
                  Inscrever-se no Evento
                </button>
                {onViewParticipants && (
                  <button 
                    onClick={onViewParticipants}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <span>👥</span>
                    Ver Participantes
                  </button>
                )}
              </>
            )}
            <button 
              onClick={onView}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold"
            >
              Ver Detalhes
            </button>
          </>
        ) : (
          // Botões para eventos inscritos ou criados (diferenciados por props)
          <>
            {onEdit || onAnalytics || onDelete ? (
              // Botões de Admin (evento criado pelo usuário)
              <>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={onView}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    Ver Detalhes
                  </button>
                  {onEdit && (
                    <button 
                      onClick={onEdit}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-semibold"
                    >
                      Editar
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {onAnalytics && (
                    <button 
                      onClick={onAnalytics}
                      className="flex-1 min-w-[100px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <span>📊</span>
                      Analytics
                    </button>
                  )}
                  {onViewParticipants && (
                    <button 
                      onClick={onViewParticipants}
                      className="flex-1 min-w-[100px] px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <span>👥</span>
                      Participantes
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={onDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      title="Excluir evento"
                    >
                      <span>🗑️</span>
                    </button>
                  )}
                </div>
                
                {/* Botão DIA DE JOGO - Aparece 24h antes do evento */}
                {showGameDayButton && (
                  <button 
                    onClick={onGameDay}
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all text-sm font-bold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 animate-pulse"
                  >
                    <span className="text-xl">🏆</span>
                    DIA DE JOGO
                  </button>
                )}
              </>
            ) : (
              // Botões de Participante (evento inscrito)
              <div className="space-y-2">
                {isRegistered ? (
                  <>
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <span className="text-xl">
                        {registrationStatus === 'confirmado' ? '✅' : '⏳'}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {registrationStatus === 'confirmado' ? 'CONFIRMADO' : 'PENDENTE (Talvez)'}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {registrationStatus === 'confirmado' ? 'Pagamento realizado' : 'Aguardando pagamento'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Botão de Pagamento se status pendente e evento pago (valor > 0) */}
                    {registrationStatus === 'pendente' && event.valor_por_pessoa > 0 && onPayment ? (
                      <button 
                        onClick={onPayment}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <span>💳</span>
                        Pagar Evento (R$ {event.valor_por_pessoa.toFixed(2)})
                      </button>
                    ) : registrationStatus === 'pendente' && event.valor_por_pessoa === 0 && (
                      <div className="w-full px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700 text-center">
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          ℹ️ Evento gratuito - Sem necessidade de pagamento
                        </p>
                      </div>
                    )}

                    {/* Botões de Presença se status confirmado */}
                    {registrationStatus === 'confirmado' && participation && currentUserId && (
                      <PresenceButtons
                        eventId={event.id}
                        userId={currentUserId}
                        participant={participation}
                        onStatusChange={() => {
                          // Callback vazio por enquanto
                        }}
                      />
                    )}

                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={onView}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold"
                      >
                        Ver Detalhes
                      </button>
                      {onViewParticipants && (
                        <button 
                          onClick={onViewParticipants}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                        >
                          <span>👥</span>
                          Participantes
                        </button>
                      )}
                    </div>

                    {onCancelRegistration && (
                      <button 
                        onClick={onCancelRegistration}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <span>❌</span>
                        Cancelar Inscrição
                      </button>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={onView}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    Ver Detalhes
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para cards de evento (placeholder)
function EventCardPlaceholder({ 
  title, 
  date, 
  location, 
  participants 
}: { 
  title: string; 
  date: string; 
  location: string; 
  participants: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
          Confirmado
        </span>
      </div>
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>👥</span>
          <span>{participants} jogadores</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold">
          Ver Detalhes
        </button>
      </div>
    </div>
  );
}
