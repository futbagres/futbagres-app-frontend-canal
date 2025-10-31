"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, SESSION_TIMEOUT } from "@/lib/supabase";
import { Profile } from "@/types/database.types";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};

// Chave para armazenar a última atividade no localStorage
const LAST_ACTIVITY_KEY = "lastActivityTime";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Atualizar última atividade
  const updateLastActivity = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  };

  // Função de logout (definida antes de ser usada)
  const signOut = async () => {
    try {
      console.log("Executando logout...");
      
      // Limpar timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Limpar última atividade do localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      }
      
      // Usar scope: 'local' para evitar erro de CORS
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error("Erro ao fazer signOut:", error);
      }
      
      setUser(null);
      setProfile(null);
      
      console.log("Logout concluído");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Mesmo com erro, limpar o estado local
      setUser(null);
      setProfile(null);
    }
  };

  // Verificar se a sessão expirou por inatividade
  const checkSessionTimeout = async () => {
    if (typeof window === "undefined") return false;

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    
    if (timeSinceLastActivity > SESSION_TIMEOUT) {
      console.log("Sessão expirou por inatividade. Fazendo logout...");
      await signOut();
      return true;
    }
    
    return false;
  };

  // Configurar timeout automático
  const setupActivityTimeout = () => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Configurar novo timeout
    timeoutRef.current = setTimeout(async () => {
      console.log("Timeout de inatividade atingido");
      await signOut();
    }, SESSION_TIMEOUT);
  };

  // Resetar timer de inatividade
  const resetInactivityTimer = () => {
    updateLastActivity();
    setupActivityTimeout();
  };

  useEffect(() => {
    // Verificar sessão atual
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Sessão obtida:", session?.user?.id);

        // Verificar se a sessão expirou por inatividade
        if (session?.user) {
          const hasExpired = await checkSessionTimeout();
          if (hasExpired) {
            setLoading(false);
            return;
          }
        }

        setUser(session?.user ?? null);

        if (session?.user) {
          // Buscar perfil do usuário
          console.log("Buscando perfil para:", session.user.id);
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Erro ao buscar perfil:", error);
          } else {
            console.log("Perfil encontrado:", profileData);
          }

          setProfile(profileData);
          
          // Iniciar monitoramento de atividade
          updateLastActivity();
          setupActivityTimeout();
        }
      } catch (error) {
        console.error("Erro ao obter sessão:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        // Ignorar eventos INITIAL_SESSION para evitar loop
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        setUser(session?.user ?? null);

        if (session?.user) {
          // Buscar perfil do usuário apenas se necessário
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            const { data: profileData, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (error) {
              console.error("Erro ao buscar perfil no auth change:", error);
            } else {
              console.log("Perfil carregado no auth change:", profileData);
            }

            setProfile(profileData);
          }
          
          // Reiniciar monitoramento de atividade
          updateLastActivity();
          setupActivityTimeout();
        } else {
          setProfile(null);
          
          // Limpar timeout quando não há usuário
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      
      // Limpar timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Array vazio - executa apenas uma vez

  // Effect separado para monitorar atividade do usuário
  useEffect(() => {
    if (!user) return;

    // Eventos de atividade do usuário para resetar o timer
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Adicionar listeners de atividade
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      // Remover listeners de atividade
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  const refreshProfile = async () => {
    try {
      if (user) {
        console.log("Recarregando perfil para usuário:", user.id);
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Erro ao carregar perfil:", error);
        } else {
          console.log("Perfil carregado:", profileData);
          setProfile(profileData);
        }
      }
    } catch (error) {
      console.error("Erro ao recarregar perfil:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
