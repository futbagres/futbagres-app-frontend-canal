"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CreateEventModal from "../components/CreateEventModal";
import EventAnalyticsModal from "../components/EventAnalyticsModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Event } from "@/types/database.types";
import { 
  getCurrentLocation, 
  calculateDistance, 
  formatDistance, 
  RADIUS_OPTIONS, 
  type Coordinates,
  type RadiusValue 
} from "@/lib/geolocation";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
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
  const [selectedRadius, setSelectedRadius] = useState<RadiusValue>(10);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showNearbyEvents, setShowNearbyEvents] = useState(false);

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
    }
  }, [user]);

  // Carregar eventos próximos quando localização ou raio mudar
  useEffect(() => {
    if (userLocation) {
      loadNearbyEvents();
    }
  }, [userLocation, selectedRadius]);

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

  // Filtrar eventos baseado no termo de busca
  const filteredEvents = myEvents.filter((event) => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      event.titulo.toLowerCase().includes(search) ||
      event.id.toLowerCase().includes(search) ||
      event.local?.toLowerCase().includes(search)
    );
  });

  const handleCreateEvent = () => {
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
        <div className="mx-auto max-w-7xl">
          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Bem-vindo de volta, <span className="font-semibold text-green-600">{profile?.nome}</span>!
            </p>
          </div>

          {/* Busca de Eventos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              🔍 Buscar Evento
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {filteredEvents.length} evento(s) encontrado(s)
              </p>
            )}
          </div>

          {/* Seções de Eventos */}
          <div className="space-y-8">
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
                          <div className="animate-spin h-5 w-5 border-3 border-blue-600 border-t-transparent rounded-full"></div>
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
                  {nearbyEvents.length > 0 ? (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          🎯 Encontramos <span className="font-bold text-green-600">{nearbyEvents.length}</span> evento(s) em um raio de <span className="font-bold">{selectedRadius}km</span>
                        </p>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nearbyEvents.map((event: any) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onView={() => handleViewEvent(event)}
                            showDistance={true}
                            distance={event.distance}
                          />
                        ))}
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

            {/* Meus Eventos Criados */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  ⚽ Meus Eventos Criados
                </h2>
                <button
                  onClick={handleCreateEvent}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Criar Evento
                </button>
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

            {/* Próximos Eventos */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📅 Eventos Disponíveis
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center min-h-[200px]">
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    Nenhum evento próximo.<br />
                    <Link href="/eventos/criar" className="text-green-600 hover:text-green-700 font-semibold">
                      Criar primeiro evento
                    </Link>
                  </p>
                </div>
              </div>
            </section>

            {/* Eventos Próximos a Você */}
            {/* <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                📍 Eventos Próximos a Você
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center min-h-[200px]">
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    Ative sua localização para<br />ver eventos próximos
                  </p>
                </div>
              </div>
            </section> */}

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
          </div>
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
    </>
  );
}

// Componente para exibir evento real
function EventCard({ 
  event, 
  onView, 
  onEdit,
  onAnalytics,
  onDelete,
  showDistance = false,
  distance
}: { 
  event: Event; 
  onView: () => void;
  onEdit?: () => void;
  onAnalytics?: () => void;
  onDelete?: () => void;
  showDistance?: boolean;
  distance?: number;
}) {
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const tipoLabels: Record<string, string> = {
    campo: "⚽ Campo",
    salao: "🏟️ Salão", 
    society: "👥 Society"
  };

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
        {event.recorrencia === "semanal" && event.dia_semana !== null && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Toda {diasSemana[event.dia_semana]}</span>
          </div>
        )}
        {event.recorrencia === "unico" && (
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Evento Único</span>
          </div>
        )}
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
          // Botões para eventos próximos (apenas visualizar)
          <button 
            onClick={onView}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
          >
            Ver Detalhes
          </button>
        ) : (
          // Botões para meus eventos (com todas as ações)
          <>
            <div className="flex gap-2">
              <button 
                onClick={onView}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
              >
                Ver Detalhes
              </button>
              <button 
                onClick={onEdit}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-semibold"
              >
                Editar
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={onAnalytics}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span>📊</span>
                Analytics
              </button>
              <button 
                onClick={onDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                title="Excluir evento"
              >
                <span>🗑️</span>
              </button>
            </div>
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
