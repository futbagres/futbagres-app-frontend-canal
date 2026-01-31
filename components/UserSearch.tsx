"use client";

import { useState, useEffect } from "react";
import { searchUsers, getUserById } from "@/lib/friendships";
import FollowButton from "./FollowButton";

interface UserSearchResult {
  id: string;
  nome: string;
  avatar_url: string | null;
  posicao: string | null;
}

interface UserSearchProps {
  placeholder?: string;
  maxResults?: number;
  onUserSelect?: (user: UserSearchResult) => void;
}

export default function UserSearch({
  placeholder = "Buscar por nome ou ID do usuário...",
  maxResults = 10,
  onUserSelect
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Função para buscar usuários
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Tentar buscar por ID primeiro (se for UUID válido)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(searchQuery.trim())) {
        const user = await getUserById(searchQuery.trim());
        if (user) {
          setResults([user]);
        } else {
          setResults([]);
          setError("Usuário não encontrado");
        }
      } else {
        // Buscar por nome
        const users = await searchUsers(searchQuery.trim(), maxResults);
        setResults(users);
        if (users.length === 0) {
          setError("Nenhum usuário encontrado");
        }
      }
    } catch (err) {
      console.error("Erro na busca:", err);
      setError("Erro ao buscar usuários");
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleUserClick = (user: UserSearchResult) => {
    onUserSelect?.(user);
    // Opcional: limpar busca após seleção
    // setQuery("");
    // setResults([]);
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

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Campo de busca */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Resultados */}
      {searched && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center text-gray-500">
              {error}
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.nome}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        user.nome.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Info do usuário */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {user.nome}
                        </span>
                        {user.posicao && (
                          <span className="text-xs text-gray-500">
                            {getPositionEmoji(user.posicao)} {user.posicao}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        ID: {user.id}
                      </div>
                    </div>

                    {/* Botão seguir */}
                    <div className="flex-shrink-0">
                      <FollowButton
                        targetUserId={user.id}
                        targetUserName={user.nome}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim() && !loading ? (
            <div className="p-4 text-center text-gray-500">
              Nenhum usuário encontrado
            </div>
          ) : null}
        </div>
      )}

      {/* Dicas de uso */}
      {!searched && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Digite o nome completo ou ID do usuário para buscar
        </div>
      )}
    </div>
  );
}