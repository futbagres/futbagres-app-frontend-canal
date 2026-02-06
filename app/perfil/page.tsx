"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FloatingNotificationButton from "../components/FloatingNotificationButton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import StarRating from "../components/StarRating";
import AvatarUpload from "../../components/AvatarUpload";
import type { PlayerPosition, PlayerEvaluation } from "@/types/database.types";

interface BagreScoreStats {
  defesa: number;
  velocidade: number;
  passe: number;
  chute: number;
  drible: number;
  media: number;
  totalAvaliacoes: number;
}

interface EvaluationWithDetails extends PlayerEvaluation {
  evento_titulo: string;
  avaliador_nome: string;
}

export default function PerfilPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    posicao: "" as PlayerPosition | "",
    chave_pix: "",
    avatar_url: "",
    auto_defesa: 3,
    auto_velocidade: 3,
    auto_passe: 3,
    auto_chute: 3,
    auto_drible: 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bagreScore, setBagreScore] = useState<BagreScoreStats | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<EvaluationWithDetails[]>([]);
  const [loadingBagreScore, setLoadingBagreScore] = useState(true);

  useEffect(() => {
    console.log("Perfil state:", { user: user?.id, profile, loading });
    
    if (!loading && !user) {
      router.push("/login");
    }
    if (profile) {
      console.log("Atualizando formData com perfil:", profile);
      setFormData({
        nome: profile.nome || "",
        email: profile.email || "",
        posicao: (profile.posicao as PlayerPosition) || "",
        chave_pix: profile.chave_pix || "",
        avatar_url: profile.avatar_url || "",
        auto_defesa: profile.auto_defesa || 3,
        auto_velocidade: profile.auto_velocidade || 3,
        auto_passe: profile.auto_passe || 3,
        auto_chute: profile.auto_chute || 3,
        auto_drible: profile.auto_drible || 3,
      });
    }
  }, [user, profile, loading, router]);

  // Carregar BagreScore
  useEffect(() => {
    if (!user?.id) return;

    const loadBagreScore = async () => {
      try {
        // Buscar avaliações
        const { data: evaluationsData, error: evalError } = await supabase
          .from("player_evaluations")
          .select("*")
          .eq("avaliado_id", user.id)
          .order("created_at", { ascending: false });

        if (evalError) throw evalError;

        if (evaluationsData && evaluationsData.length > 0) {
          // Calcular médias
          const totais = evaluationsData.reduce(
            (acc, aval: any) => ({
              defesa: acc.defesa + aval.defesa,
              velocidade: acc.velocidade + aval.velocidade,
              passe: acc.passe + aval.passe,
              chute: acc.chute + aval.chute,
              drible: acc.drible + aval.drible,
            }),
            { defesa: 0, velocidade: 0, passe: 0, chute: 0, drible: 0 }
          );

          const count = evaluationsData.length;
          const medias = {
            defesa: totais.defesa / count,
            velocidade: totais.velocidade / count,
            passe: totais.passe / count,
            chute: totais.chute / count,
            drible: totais.drible / count,
          };

          const mediaGeral =
            (medias.defesa + medias.velocidade + medias.passe + medias.chute + medias.drible) / 5;

          setBagreScore({
            ...medias,
            media: mediaGeral,
            totalAvaliacoes: count,
          });

          // Buscar dados dos eventos e avaliadores
          const eventIds = [...new Set(evaluationsData.map((e: any) => e.event_id))];
          const avaliadorIds = [...new Set(evaluationsData.map((e: any) => e.avaliador_id))];

          const { data: eventsData } = await supabase
            .from("events")
            .select("id, titulo")
            .in("id", eventIds);

          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, nome")
            .in("id", avaliadorIds);

          // Criar mapas para lookup rápido
          const eventsMap = new Map(eventsData?.map((e: any) => [e.id, e.titulo]) || []);
          const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p.nome]) || []);

          // Formatar avaliações
          const avaliacoesFormatadas: EvaluationWithDetails[] = evaluationsData.map((aval: any) => ({
            ...aval,
            evento_titulo: eventsMap.get(aval.event_id) || "Evento removido",
            avaliador_nome: profilesMap.get(aval.avaliador_id) || "Jogador desconhecido",
          }));
          setAvaliacoes(avaliacoesFormatadas);
        }
      } catch (err) {
        console.error("Erro ao carregar BagreScore:", err);
      } finally {
        setLoadingBagreScore(false);
      }
    };

    loadBagreScore();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleRatingChange = (field: string, value: number) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleAvatarUpdate = (url: string | null) => {
    setFormData(prev => ({ ...prev, avatar_url: url || "" }));
    // Recarregar o perfil para refletir as mudanças
    refreshProfile();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        // @ts-ignore - Supabase types issue
        .update({
          nome: formData.nome,
          email: formData.email,
          posicao: formData.posicao || null,
          chave_pix: formData.chave_pix || null,
          auto_defesa: formData.auto_defesa,
          auto_velocidade: formData.auto_velocidade,
          auto_passe: formData.auto_passe,
          auto_chute: formData.auto_chute,
          auto_drible: formData.auto_drible,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      // Recarregar o perfil após atualização
      await refreshProfile();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erro ao atualizar perfil:", err);
      setError(err.message || "Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const posicoes: { value: PlayerPosition; label: string; emoji: string }[] = [
    { value: "goleiro", label: "Goleiro", emoji: "🧤" },
    { value: "zagueiro", label: "Zagueiro", emoji: "🛡️" },
    { value: "lateral", label: "Lateral", emoji: "➡️" },
    { value: "volante", label: "Volante", emoji: "⚙️" },
    { value: "meia", label: "Meia", emoji: "🎯" },
    { value: "atacante", label: "Atacante", emoji: "⚡" },
  ];

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
      <main className="min-h-screen pt-24 pb-12 px-4 bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="mx-auto max-w-6xl">
          
          {/* Header Rico com Avatar e BagreScore */}
          <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 rounded-3xl shadow-2xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Padrão de fundo */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              {/* Avatar Grande */}
              <div className="relative group">
                <AvatarUpload
                  user={user}
                  currentAvatarUrl={profile?.avatar_url || null}
                  onAvatarUpdate={handleAvatarUpdate}
                />
                
                {/* Badge de BagreScore */}
                {bagreScore && bagreScore.media >= 4.0 && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-3 shadow-xl animate-pulse">
                    <span className="text-2xl">🏆</span>
                  </div>
                )}
              </div>
              
              {/* Info do Usuário */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold text-white mb-3">
                  {formData.nome || "Complete seu perfil"}
                </h1>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                  {formData.posicao && (
                    <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white font-medium">
                      {posicoes.find(p => p.value === formData.posicao)?.emoji} 
                      {posicoes.find(p => p.value === formData.posicao)?.label}
                    </span>
                  )}
                  
                  <span className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm">
                    👤 {profile?.role || "player"}
                  </span>
                  
                  {bagreScore && (
                    <span className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2 rounded-full text-gray-900 font-bold text-sm shadow-lg">
                      ⭐ {bagreScore.media.toFixed(1)} BagreScore
                    </span>
                  )}
                  
                  {bagreScore && bagreScore.totalAvaliacoes >= 10 && (
                    <span className="flex items-center gap-2 bg-purple-500 px-4 py-2 rounded-full text-white font-semibold text-sm shadow-lg">
                      🔥 Jogador Experiente
                    </span>
                  )}
                </div>
                
                <p className="text-white/80 text-sm">
                  📅 Membro desde {new Date(profile?.created_at || "").toLocaleDateString("pt-BR", { 
                    month: "long", 
                    year: "numeric" 
                  })}
                </p>
              </div>

              {/* Stats Rápidos */}
              <div className="flex md:flex-col gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                  <div className="text-3xl font-bold text-white">{bagreScore?.totalAvaliacoes || 0}</div>
                  <div className="text-xs text-white/80">Avaliações</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[100px]">
                  <div className="text-3xl font-bold text-white">
                    {formData.auto_defesa ? 
                      ((formData.auto_defesa + formData.auto_velocidade + formData.auto_passe + formData.auto_chute + formData.auto_drible) / 5).toFixed(1) 
                      : "N/A"}
                  </div>
                  <div className="text-xs text-white/80">Autoavaliação</div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Responsivo: Form + BagreScore */}
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Coluna Principal - Formulário */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Mensagens */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg animate-shake">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">❌</span>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-lg animate-bounce">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Perfil atualizado com sucesso!
                    </p>
                  </div>
                </div>
              )}

              {/* Card: Dados Pessoais */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  Dados Pessoais
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="inline-flex items-center gap-2">
                        💳 Chave PIX
                        <span className="text-xs font-normal text-gray-500">(opcional)</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="chave_pix"
                      value={formData.chave_pix}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                      <span>ℹ️</span>
                      <span>Necessário apenas se você criar eventos pagos. Os jogadores usarão esta chave para pagar.</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      ⚽ Posição Principal
                    </label>
                    <select
                      name="posicao"
                      value={formData.posicao}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all"
                    >
                      <option value="">Selecione sua posição</option>
                      {posicoes.map((pos) => (
                        <option key={pos.value} value={pos.value}>
                          {pos.emoji} {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Autoavaliação Compacta */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-6 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                    <h4 className="text-md font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>⭐</span>
                      Autoavaliação
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                        (Como você se avalia?)
                      </span>
                    </h4>
                    
                    <div className="space-y-4">
                      <StarRating
                        label="🛡️ Defesa"
                        value={formData.auto_defesa}
                        onChange={(value) => handleRatingChange("auto_defesa", value)}
                        showValue
                      />
                      <StarRating
                        label="⚡ Velocidade"
                        value={formData.auto_velocidade}
                        onChange={(value) => handleRatingChange("auto_velocidade", value)}
                        showValue
                      />
                      <StarRating
                        label="🎯 Passe"
                        value={formData.auto_passe}
                        onChange={(value) => handleRatingChange("auto_passe", value)}
                        showValue
                      />
                      <StarRating
                        label="⚽ Chute"
                        value={formData.auto_chute}
                        onChange={(value) => handleRatingChange("auto_chute", value)}
                        showValue
                      />
                      <StarRating
                        label="🎨 Drible"
                        value={formData.auto_drible}
                        onChange={(value) => handleRatingChange("auto_drible", value)}
                        showValue
                      />
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 text-white font-bold text-lg hover:from-green-700 hover:to-blue-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Salvando alterações...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Card: Informações Técnicas */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg p-6 border border-gray-300 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <span>🔧</span>
                  Informações Técnicas
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">ID:</span>
                    <code className="text-gray-600 dark:text-gray-400 break-all bg-white dark:bg-gray-800 px-2 py-1 rounded">{user.id}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">Criado em:</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {new Date(profile?.created_at || "").toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Lateral - BagreScore e Avaliações */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Card: BagreScore Principal */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  BagreScore
                </h2>

                {loadingBagreScore ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Carregando...</p>
                  </div>
                ) : bagreScore ? (
                  <div className="space-y-6">
                    {/* Média Geral Destaque */}
                    <div className="text-center p-6 bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 rounded-2xl shadow-2xl">
                      <div className="text-6xl font-black text-white mb-2 drop-shadow-lg">
                        {bagreScore.media.toFixed(1)}
                      </div>
                      <div className="text-white font-bold mb-1">Média Geral</div>
                      <div className="text-white/90 text-xs">
                        {bagreScore.totalAvaliacoes} avaliação{bagreScore.totalAvaliacoes !== 1 ? "ões" : ""}
                      </div>
                    </div>

                    {/* Habilidades Compactas */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🛡️</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Defesa</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold text-green-600">{bagreScore.defesa.toFixed(1)}</div>
                          <StarRating value={bagreScore.defesa} readonly size="sm" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚡</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Velocidade</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold text-blue-600">{bagreScore.velocidade.toFixed(1)}</div>
                          <StarRating value={bagreScore.velocidade} readonly size="sm" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎯</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Passe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold text-purple-600">{bagreScore.passe.toFixed(1)}</div>
                          <StarRating value={bagreScore.passe} readonly size="sm" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚽</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chute</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold text-red-600">{bagreScore.chute.toFixed(1)}</div>
                          <StarRating value={bagreScore.chute} readonly size="sm" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎨</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Drible</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold text-orange-600">{bagreScore.drible.toFixed(1)}</div>
                          <StarRating value={bagreScore.drible} readonly size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Histórico de Avaliações */}
                    {avaliacoes.length > 0 && (
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <span>📋</span>
                          Últimas Avaliações
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                          {avaliacoes.slice(0, 5).map((aval, index) => (
                            <div
                              key={index}
                              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-all"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1">
                                    {aval.evento_titulo}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    👤 {aval.avaliador_nome}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    📅 {new Date(aval.created_at).toLocaleDateString("pt-BR")}
                                  </div>
                                </div>
                                <div className="text-2xl font-bold text-yellow-500">
                                  {((aval.defesa + aval.velocidade + aval.passe + aval.chute + aval.drible) / 5).toFixed(1)} ⭐
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">DEF</div>
                                  <div className="font-bold text-gray-900 dark:text-white">{aval.defesa}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">VEL</div>
                                  <div className="font-bold text-gray-900 dark:text-white">{aval.velocidade}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">PAS</div>
                                  <div className="font-bold text-gray-900 dark:text-white">{aval.passe}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">CHU</div>
                                  <div className="font-bold text-gray-900 dark:text-white">{aval.chute}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 rounded">
                                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">DRI</div>
                                  <div className="font-bold text-gray-900 dark:text-white">{aval.drible}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {avaliacoes.length > 5 && (
                          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                            + {avaliacoes.length - 5} avaliações mais antigas
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎮</div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                      Sem avaliações ainda
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Participe de eventos e peça para outros jogadores te avaliarem!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
