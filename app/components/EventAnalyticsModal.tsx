"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import type { Event } from "@/types/database.types";

interface EventAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

interface ParticipantStats {
  confirmados: number;
  talvez: number;
  cancelados: number;
  vagasDisponiveis: number;
  valorArrecadado: number;
  valorPendente: number;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export default function EventAnalyticsModal({
  isOpen,
  onClose,
  event,
}: EventAnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ParticipantStats>({
    confirmados: 0,
    talvez: 0,
    cancelados: 0,
    vagasDisponiveis: event.max_participantes,
    valorArrecadado: 0,
    valorPendente: 0,
  });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
      loadWeather();
    }
  }, [isOpen, event.id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Buscar participantes do evento
      // @ts-ignore - Supabase types issue
      const { data: participants, error } = await supabase
        .from("event_participants")
        .select("status")
        .eq("event_id", event.id);

      if (error) throw error;

      // Calcular estatísticas com nova lógica:
      // - confirmado = pagamento realizado (✅ CONFIRMADOS)
      // - pendente = aguardando pagamento (⏳ TALVEZ)
      // - cancelado = inscrição cancelada (❌ CANCELADOS)
      const confirmados = participants?.filter((p: any) => p.status === "confirmado").length || 0;
      const talvez = participants?.filter((p: any) => p.status === "pendente").length || 0;
      const cancelados = participants?.filter((p: any) => p.status === "cancelado").length || 0;
      
      // Apenas confirmados contam nas vagas
      const vagasDisponiveis = event.max_participantes - confirmados;
      
      // Calcular valores
      // Confirmados = já pagaram
      const valorArrecadado = confirmados * (event.valor_por_pessoa || 0);
      
      // Pendentes = aguardando pagamento (talvez)
      const valorPendente = talvez * (event.valor_por_pessoa || 0);

      setStats({
        confirmados,
        talvez,
        cancelados,
        vagasDisponiveis,
        valorArrecadado,
        valorPendente,
      });
    } catch (error: any) {
      console.error("Erro ao carregar analytics:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWeather = async () => {
    try {
      setWeatherLoading(true);
      
      const OPENWEATHER_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      
      console.log("🌤️ Carregando previsão do tempo...");
      console.log("OpenWeather API KEY presente:", OPENWEATHER_KEY ? "✅ Sim" : "❌ Não");
      
      // Coordenadas de exemplo (São Paulo)
      const lat = -23.5505;
      const lon = -46.6333;
      
      // Tentar OpenWeatherMap primeiro (se key configurada)
      if (OPENWEATHER_KEY && OPENWEATHER_KEY !== "demo") {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric&lang=pt_br`;
        console.log("📡 Tentando OpenWeatherMap...");
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Dados do clima recebidos (OpenWeatherMap):", data);
          
          setWeather({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed * 3.6),
          });
          return;
        } else {
          const errorData = await response.json();
          console.warn("⚠️ OpenWeatherMap falhou:", errorData.message);
        }
      }
      
      // Fallback: Usar Open-Meteo (API gratuita sem necessidade de key)
      console.log("📡 Usando Open-Meteo (sem API key necessária)...");
      const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America/Sao_Paulo`;
      
      const meteoResponse = await fetch(meteoUrl);
      
      if (!meteoResponse.ok) {
        throw new Error("Erro ao buscar clima");
      }
      
      const meteoData = await meteoResponse.json();
      console.log("✅ Dados do clima recebidos (Open-Meteo):", meteoData);
      
      // Mapear weather code para descrição e ícone
      const weatherCodeMap: Record<number, { description: string; icon: string }> = {
        0: { description: "céu limpo", icon: "01d" },
        1: { description: "principalmente limpo", icon: "02d" },
        2: { description: "parcialmente nublado", icon: "03d" },
        3: { description: "nublado", icon: "04d" },
        45: { description: "neblina", icon: "50d" },
        48: { description: "neblina com geada", icon: "50d" },
        51: { description: "garoa leve", icon: "09d" },
        53: { description: "garoa moderada", icon: "09d" },
        55: { description: "garoa forte", icon: "09d" },
        61: { description: "chuva leve", icon: "10d" },
        63: { description: "chuva moderada", icon: "10d" },
        65: { description: "chuva forte", icon: "10d" },
        80: { description: "pancadas de chuva", icon: "09d" },
        95: { description: "tempestade", icon: "11d" },
      };
      
      const weatherCode = meteoData.current.weather_code;
      const weatherInfo = weatherCodeMap[weatherCode] || { description: "tempo variável", icon: "02d" };
      
      setWeather({
        temp: Math.round(meteoData.current.temperature_2m),
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        humidity: meteoData.current.relative_humidity_2m,
        windSpeed: Math.round(meteoData.current.wind_speed_10m),
      });
      
    } catch (error: any) {
      console.error("❌ Erro ao carregar clima:", error);
      console.error("Mensagem:", error.message);
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📊 Analytics do Evento">
      <div className="space-y-6">
        {/* Título do Evento */}
        <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {event.titulo}
          </h3>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>🕐 {event.horario_inicio} - {event.horario_fim}</span>
            {event.recorrencia === "semanal" && event.dia_semana !== null && (
              <span>📅 Toda {diasSemana[event.dia_semana]}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Estatísticas de Participantes */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                👥 Participantes
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.confirmados}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ✅ Confirmados
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-500 mt-1 font-medium">
                    Pagamento realizado
                  </div>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.talvez}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ⏳ Talvez (Pendentes)
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 font-medium">
                    Aguardando pagamento
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.vagasDisponiveis}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    🎯 Vagas Disponíveis
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.cancelados}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ❌ Cancelados
                  </div>
                </div>
              </div>
              
              {/* Barra de progresso segmentada */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-semibold">Distribuição de Vagas</span>
                  <span className="font-semibold">{stats.confirmados + stats.talvez}/{event.max_participantes}</span>
                </div>
                
                {/* Barra segmentada */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden flex">
                  {/* Confirmados (Verde) */}
                  {stats.confirmados > 0 && (
                    <div 
                      className="bg-green-600 dark:bg-green-500 h-full flex items-center justify-center transition-all relative group"
                      style={{ width: `${(stats.confirmados / event.max_participantes) * 100}%` }}
                      title={`${stats.confirmados} confirmados`}
                    >
                      {(stats.confirmados / event.max_participantes) * 100 > 8 && (
                        <span className="text-xs font-bold text-white">
                          {stats.confirmados}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Pendentes/Talvez (Amarelo) */}
                  {stats.talvez > 0 && (
                    <div 
                      className="bg-yellow-500 dark:bg-yellow-400 h-full flex items-center justify-center transition-all relative group"
                      style={{ width: `${(stats.talvez / event.max_participantes) * 100}%` }}
                      title={`${stats.talvez} pendentes`}
                    >
                      {(stats.talvez / event.max_participantes) * 100 > 8 && (
                        <span className="text-xs font-bold text-white">
                          {stats.talvez}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Vagas Disponíveis (Azul claro) */}
                  {stats.vagasDisponiveis > 0 && (
                    <div 
                      className="bg-blue-400 dark:bg-blue-500 h-full flex items-center justify-center transition-all relative group"
                      style={{ width: `${(stats.vagasDisponiveis / event.max_participantes) * 100}%` }}
                      title={`${stats.vagasDisponiveis} vagas disponíveis`}
                    >
                      {(stats.vagasDisponiveis / event.max_participantes) * 100 > 8 && (
                        <span className="text-xs font-bold text-white">
                          {stats.vagasDisponiveis}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Legenda */}
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Confirmados: {stats.confirmados}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Pendentes: {stats.talvez}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Disponíveis: {stats.vagasDisponiveis}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas Financeiras */}
            {event.valor_por_pessoa > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  💰 Financeiro
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {stats.valorArrecadado.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      💵 Valor Arrecadado
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      ({stats.confirmados - (stats.valorPendente / (event.valor_por_pessoa || 1))} pagamentos confirmados)
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      R$ {stats.valorPendente.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      ⏳ Pagamentos Pendentes
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      ({stats.valorPendente / (event.valor_por_pessoa || 1)} confirmados aguardando pagamento)
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Valor Total Esperado
                    </span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      R$ {(stats.valorArrecadado + stats.valorPendente).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Previsão do Tempo */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🌤️ Previsão do Tempo
              </h4>
              {weatherLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : weather ? (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-4">
                    <img 
                      src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                      alt="Weather icon"
                      className="w-20 h-20"
                    />
                    <div className="flex-1">
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {weather.temp}°C
                      </div>
                      <div className="text-lg text-gray-700 dark:text-gray-300 capitalize">
                        {weather.description}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                    <div className="text-center">
                      <div className="text-2xl">💧</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Umidade: {weather.humidity}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl">💨</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Vento: {weather.windSpeed} km/h
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-3">🌤️</div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    Previsão do tempo indisponível no momento
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Verifique sua conexão com a internet ou tente novamente mais tarde
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Botão Fechar */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
