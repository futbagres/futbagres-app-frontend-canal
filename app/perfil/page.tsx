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
      <main className="min-h-screen pt-24 pb-12 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Cabeçalho */}
            <div className="text-center mb-8">
              <AvatarUpload
                user={user}
                currentAvatarUrl={profile?.avatar_url || null}
                onAvatarUpdate={handleAvatarUpdate}
              />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 mt-4">
                Meu Perfil
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Role: <span className="font-semibold capitalize text-green-600">{profile?.role || "carregando..."}</span>
              </p>
              {!profile && (
                <button
                  onClick={refreshProfile}
                  className="mt-4 text-sm text-green-600 hover:text-green-700 underline"
                >
                  Recarregar perfil
                </button>
              )}
            </div>

            {/* Mensagens */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✅ Perfil atualizado com sucesso!
                </p>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Dados Básicos */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  📝 Dados Pessoais
                </h3>
                
                <div>
                  <label
                    htmlFor="nome"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    E-mail
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="chave_pix"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    💳 Chave PIX (para receber pagamentos)
                  </label>
                  <input
                    type="text"
                    id="chave_pix"
                    name="chave_pix"
                    value={formData.chave_pix}
                    onChange={handleChange}
                    placeholder="CPF, email, telefone ou chave aleatória"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    ℹ️ Necessário apenas se você criar eventos pagos. Os jogadores usarão esta chave para pagar.
                  </p>
                </div>
              </div>

              {/* Posição do Jogador */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  ⚽ Minha Posição
                </h3>
                
                <div>
                  <label
                    htmlFor="posicao"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Selecione sua posição principal
                  </label>
                  <select
                    id="posicao"
                    name="posicao"
                    value={formData.posicao}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Selecione uma posição</option>
                    {posicoes.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.emoji} {pos.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Autoavaliação */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  ⭐ Autoavaliação
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Como você avalia suas habilidades? (0.5 a 5 estrelas)
                </p>
                
                <div className="space-y-6 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
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

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>ID do Usuário:</strong> <code className="text-xs">{user.id}</code>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <strong>Membro desde:</strong> {new Date(profile?.created_at || "").toLocaleDateString("pt-BR")}
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-green-600 px-4 py-3 text-white font-semibold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </button>
            </form>

            {/* BagreScore - Avaliações Recebidas */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🏆 BagreScore
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  (Avaliações de outros jogadores)
                </span>
              </h2>

              {loadingBagreScore ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : bagreScore ? (
                <div className="space-y-6">
                  {/* Média Geral */}
                  <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg border-2 border-yellow-400 dark:border-yellow-600">
                    <div className="text-5xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                      {bagreScore.media.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Média Geral
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Baseado em {bagreScore.totalAvaliacoes} avaliação(ões)
                    </div>
                  </div>

                  {/* Habilidades */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          🛡️ Defesa
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {bagreScore.defesa.toFixed(1)}
                        </span>
                      </div>
                      <StarRating value={bagreScore.defesa} readonly size="sm" />
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          ⚡ Velocidade
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {bagreScore.velocidade.toFixed(1)}
                        </span>
                      </div>
                      <StarRating value={bagreScore.velocidade} readonly size="sm" />
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          🎯 Passe
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {bagreScore.passe.toFixed(1)}
                        </span>
                      </div>
                      <StarRating value={bagreScore.passe} readonly size="sm" />
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          ⚽ Chute
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {bagreScore.chute.toFixed(1)}
                        </span>
                      </div>
                      <StarRating value={bagreScore.chute} readonly size="sm" />
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          🎨 Drible
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {bagreScore.drible.toFixed(1)}
                        </span>
                      </div>
                      <StarRating value={bagreScore.drible} readonly size="sm" />
                    </div>
                  </div>

                  {/* Histórico de Avaliações */}
                  {avaliacoes.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                        📋 Histórico de Avaliações
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {avaliacoes.map((aval, index) => (
                          <div
                            key={index}
                            className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {aval.evento_titulo}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Avaliado por: {aval.avaliador_nome}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                  {new Date(aval.created_at).toLocaleDateString("pt-BR")}
                                </div>
                              </div>
                              <div className="text-lg font-bold text-yellow-600">
                                {((aval.defesa + aval.velocidade + aval.passe + aval.chute + aval.drible) / 5).toFixed(1)} ⭐
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-center text-xs">
                              <div>
                                <div className="text-gray-600 dark:text-gray-400">Defesa</div>
                                <div className="font-bold text-gray-900 dark:text-white">{aval.defesa}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-gray-400">Velocidade</div>
                                <div className="font-bold text-gray-900 dark:text-white">{aval.velocidade}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-gray-400">Passe</div>
                                <div className="font-bold text-gray-900 dark:text-white">{aval.passe}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-gray-400">Chute</div>
                                <div className="font-bold text-gray-900 dark:text-white">{aval.chute}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-gray-400">Drible</div>
                                <div className="font-bold text-gray-900 dark:text-white">{aval.drible}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-4xl mb-4">🎮</div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Você ainda não possui avaliações
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Participe de eventos e peça para outros jogadores te avaliarem!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
