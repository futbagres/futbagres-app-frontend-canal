"use client";

import { useState, useEffect, useRef } from "react";

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface LocationSearchProps {
  value: string;
  onChange: (location: string, lat: number | null, lon: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function LocationSearch({
  value,
  onChange,
  disabled = false,
  placeholder = "Digite o endereço do local...",
}: LocationSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fechar resultados ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sincronizar com prop value
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // Usando Nominatim API (OpenStreetMap) - gratuita e sem necessidade de API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: query,
            format: "json",
            addressdetails: "1",
            limit: "5",
            countrycodes: "br", // Foco no Brasil
          }),
        {
          headers: {
            "User-Agent": "FutebagresApp/1.0", // Necessário para Nominatim
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Erro ao buscar localização:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // Debounce na busca
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(newValue);
    }, 500);
  };

  const handleSelectLocation = (result: LocationResult) => {
    const selectedLocation = result.display_name;
    setSearchTerm(selectedLocation);
    onChange(selectedLocation, parseFloat(result.lat), parseFloat(result.lon));
    setShowResults(false);
    setResults([]);
  };

  const formatDisplayName = (result: LocationResult): string => {
    const address = result.address;
    if (!address) return result.display_name;

    const parts = [
      address.road,
      address.suburb || address.city,
      address.state,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : result.display_name;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            disabled ? "opacity-70 cursor-not-allowed" : ""
          }`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Resultados da busca */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectLocation(result)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {formatDisplayName(result)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {result.display_name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Nenhum resultado encontrado */}
      {showResults && !isLoading && results.length === 0 && searchTerm.length >= 3 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhum local encontrado. Tente outro termo de busca.
          </p>
        </div>
      )}
    </div>
  );
}
