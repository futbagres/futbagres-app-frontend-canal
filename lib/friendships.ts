import { supabase } from './supabase';
import type { Friendship } from '@/types/database.types';

export interface FollowerStats {
  followersCount: number;
  followingCount: number;
}

export interface FriendshipWithProfile extends Friendship {
  follower_profile?: {
    nome: string;
    avatar_url: string | null;
  };
  following_profile?: {
    nome: string;
    avatar_url: string | null;
  };
}

/**
 * Seguir um usuário
 */
export async function followUser(followingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    if (user.id === followingId) {
      return { success: false, error: 'Não é possível seguir a si mesmo' };
    }

    // Verificar se já segue
    const { data: existing } = await supabase
      .from('friendships')
      // @ts-ignore - Tabela será criada via SQL
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      return { success: false, error: 'Já segue este usuário' };
    }

    // Criar relacionamento
    const { error } = await supabase
      .from('friendships')
      // @ts-ignore - Tabela será criada via SQL
      .insert({
        follower_id: user.id,
        following_id: followingId,
        status: 'active'
      });

    if (error) {
      console.error('Erro ao seguir usuário:', error);
      return { success: false, error: 'Erro ao seguir usuário' };
    }

    // Criar notificação para o usuário seguido
    const { data: followerProfile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single();

    if (followerProfile) {
      await supabase
        .from('notifications')
        // @ts-ignore - Novo tipo de notificação será adicionado via SQL
        .insert({
          user_id: followingId,
          type: 'new_follower',
          title: 'Novo seguidor!',
          message: `${(followerProfile as any).nome} começou a seguir você`,
          data: { follower_id: user.id }
        });
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao seguir usuário:', error);
    return { success: false, error: 'Erro inesperado' };
  }
}

/**
 * Deixar de seguir um usuário
 */
export async function unfollowUser(followingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const { error } = await supabase
      .from('friendships')
      // @ts-ignore - Tabela será criada via SQL
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (error) {
      console.error('Erro ao deixar de seguir:', error);
      return { success: false, error: 'Erro ao deixar de seguir' };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao deixar de seguir:', error);
    return { success: false, error: 'Erro inesperado' };
  }
}

/**
 * Verificar se o usuário atual segue outro usuário
 */
export async function isFollowing(followingId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('friendships')
      // @ts-ignore - Tabela será criada via SQL
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .eq('status', 'active')
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Obter estatísticas de seguidores
 */
export async function getFollowerStats(userId: string): Promise<FollowerStats> {
  try {
    const [followersResult, followingResult] = await Promise.all([
      supabase
        .from('friendships')
        // @ts-ignore - Tabela será criada via SQL
        .select('id', { count: 'exact' })
        .eq('following_id', userId)
        .eq('status', 'active'),
      supabase
        .from('friendships')
        // @ts-ignore - Tabela será criada via SQL
        .select('id', { count: 'exact' })
        .eq('follower_id', userId)
        .eq('status', 'active')
    ]);

    return {
      followersCount: followersResult.count || 0,
      followingCount: followingResult.count || 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return { followersCount: 0, followingCount: 0 };
  }
}

/**
 * Buscar usuários por nome
 */
export async function searchUsers(query: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, avatar_url, posicao')
      .ilike('nome', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Erro na busca:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro na busca:', error);
    return [];
  }
}

/**
 * Buscar usuário por ID
 */
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        nome,
        avatar_url,
        posicao,
        auto_defesa,
        auto_velocidade,
        auto_passe,
        auto_chute,
        auto_drible,
        chave_pix,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
}

/**
 * Obter lista de seguidores
 */
export async function getFollowers(userId: string, limit: number = 50) {
  try {
    // Primeiro, vamos testar se a tabela friendships existe e tem dados
    const { data: testData, error: testError } = await supabase
      .from('friendships')
      .select('*')
      .eq('following_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (testError) {
      console.error('Erro na tabela friendships:', testError);
      return [];
    }

    console.log('Dados de teste friendships:', testData);

    // Agora fazer a query completa com join usando view
    const { data, error } = await supabase
      .from('friendships_with_profiles')
      // @ts-ignore - View será criada via SQL
      .select(`
        id,
        follower_id,
        following_id,
        created_at,
        follower_profile:follower_profile,
        following_profile:following_profile
      `)
      .eq('following_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao obter seguidores:', error);
      // Fallback: retornar apenas os IDs sem join
      const { data: fallbackData } = await supabase
        .from('friendships')
        .select('follower_id, created_at')
        .eq('following_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackData) {
        // Buscar perfis separadamente
        const followerIds = (fallbackData as any[]).map((f: any) => f.follower_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome, avatar_url, posicao')
          .in('id', followerIds);

        const profilesMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);

        return (fallbackData as any[]).map((f: any) => ({
          id: f.follower_id, // Usando follower_id como id temporário
          follower_id: f.follower_id,
          created_at: f.created_at,
          follower_profile: profilesMap.get(f.follower_id) || { nome: 'Usuário', avatar_url: null, posicao: null }
        }));
      }

      return [];
    }

    // Reformatar dados para manter consistência
    return ((data as any[]) || []).map((item: any) => ({
      id: item.id,
      follower_id: item.follower_id,
      created_at: item.created_at,
      follower_profile: item.follower_profile
    }));
  } catch (error) {
    console.error('Erro ao obter seguidores:', error);
    return [];
  }
}

/**
 * Obter lista de quem o usuário segue
 */
export async function getFollowing(userId: string, limit: number = 50) {
  try {
    // Primeiro, vamos testar se a tabela friendships existe e tem dados
    const { data: testData, error: testError } = await supabase
      .from('friendships')
      .select('*')
      .eq('follower_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (testError) {
      console.error('Erro na tabela friendships:', testError);
      return [];
    }

    console.log('Dados de teste friendships (following):', testData);

    // Agora fazer a query completa com join usando view
    const { data, error } = await supabase
      .from('friendships_with_profiles')
      // @ts-ignore - View será criada via SQL
      .select(`
        id,
        follower_id,
        following_id,
        created_at,
        follower_profile:follower_profile,
        following_profile:following_profile
      `)
      .eq('follower_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao obter seguindo:', error);
      // Fallback: retornar apenas os IDs sem join
      const { data: fallbackData } = await supabase
        .from('friendships')
        .select('following_id, created_at')
        .eq('follower_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackData) {
        // Buscar perfis separadamente
        const followingIds = (fallbackData as any[]).map((f: any) => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome, avatar_url, posicao')
          .in('id', followingIds);

        const profilesMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);

        return (fallbackData as any[]).map((f: any) => ({
          id: f.following_id, // Usando following_id como id temporário
          following_id: f.following_id,
          created_at: f.created_at,
          following_profile: profilesMap.get(f.following_id) || { nome: 'Usuário', avatar_url: null, posicao: null }
        }));
      }

      return [];
    }

    // Reformatar dados para manter consistência
    return ((data as any[]) || []).map((item: any) => ({
      id: item.id,
      following_id: item.following_id,
      created_at: item.created_at,
      following_profile: item.following_profile
    }));
  } catch (error) {
    console.error('Erro ao obter seguindo:', error);
    return [];
  }
}