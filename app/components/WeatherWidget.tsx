"use client";

import { useState, useEffect } from "react";
import {
  getWeatherByCoordinates,
  getWeatherIconUrl,
  getWeatherRecommendation,
} from "@/lib/weather";

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  eventTitle: string;
}

export default function WeatherWidget({
  latitude,
  longitude,
  eventTitle,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWeather() {
      setLoading(true);
      setError(false);

      try {
        const data = await getWeatherByCoordinates(latitude, longitude);
        if (data) {
          setWeather(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Erro ao carregar clima:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (latitude && longitude) {
      fetchWeather();
    }
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Carregando informações do clima...
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Aguarde um momento
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Clima indisponível
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Não foi possível obter informações meteorológicas
            </p>
          </div>
        </div>
      </div>
    );
  }

  const recommendation = getWeatherRecommendation(weather);

  return (
    <div
      className={`rounded-lg p-4 border ${
        recommendation.suitable
          ? "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 border-green-200 dark:border-green-800"
          : "bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-800/20 border-orange-200 dark:border-orange-800"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Informação principal */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{recommendation.icon}</span>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Previsão do Tempo
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                {weather.description}
              </p>
            </div>
          </div>

          <p
            className={`text-sm font-medium mb-3 ${
              recommendation.suitable
                ? "text-green-700 dark:text-green-300"
                : "text-orange-700 dark:text-orange-300"
            }`}
          >
            {recommendation.message}
          </p>

          {/* Detalhes do clima */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🌡️</span>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Temperatura</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {weather.temp}°C
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base">💧</span>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Umidade</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {weather.humidity}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base">💨</span>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Vento</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {weather.wind_speed.toFixed(1)} m/s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base">☁️</span>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Nuvens</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {weather.clouds}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ícone do tempo */}
        <div className="flex-shrink-0">
          <img
            src={getWeatherIconUrl(weather.icon)}
            alt={weather.description}
            className="w-20 h-20"
          />
        </div>
      </div>
    </div>
  );
}
