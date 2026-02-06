"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function NewEventPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    tipo_futebol: "campo" as "campo" | "salao" | "society",
    max_participantes: 22,
    recorrencia: "unico" as "unico" | "mensal",
    data_evento: "",
    data_inicio: "",
    data_fim: "",
    horario_inicio: "19:00",
    horario_fim: "21:00",
    valor_por_pessoa: 0,
    local: "",
    latitude: null as number | null,
    longitude: null as number | null,
    descricao: "",
    requer_pagamento: false,
    data_limite_pagamento: "",
    sazonalidade_meses: null as number | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const eventData = {
        ...formData,
        criador_id: user.id,
        status: "ativo",
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        data_limite_pagamento: formData.data_limite_pagamento || null,
        sazonalidade_meses: formData.sazonalidade_meses || null
      };

      // @ts-ignore - Supabase type inference issue
      const { data, error } = await supabase
        .from('events')
        // @ts-ignore
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      alert('✅ Evento criado com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro ao criar evento:', error);
      alert('Erro ao criar evento: ' + error.message);
    } finally {
      setIsSubmitting(false);
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
    router.push('/login');
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl">
          {/* Cabeçalho */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ← Voltar
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Criar Novo Evento
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Preencha os detalhes do seu evento de futebol
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Básicas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                📋 Informações Básicas
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Título do Evento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ex: Pelada do Domingo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Futebol *
                  </label>
                  <select
                    required
                    value={formData.tipo_futebol}
                    onChange={(e) => setFormData({...formData, tipo_futebol: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="campo">⚽ Campo</option>
                    <option value="salao">🏟️ Salão</option>
                    <option value="society">👥 Society</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Máximo de Participantes *
                  </label>
                  <input
                    type="number"
                    required
                    min="2"
                    max="50"
                    value={formData.max_participantes}
                    onChange={(e) => setFormData({...formData, max_participantes: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recorrência *
                  </label>
                  <select
                    required
                    value={formData.recorrencia}
                    onChange={(e) => setFormData({...formData, recorrencia: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="unico">📅 Evento Único</option>
                    <option value="mensal">📆 Mensal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data e Horário */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                📅 Data e Horário
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {formData.recorrencia === 'unico' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Data do Evento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.data_evento}
                      onChange={(e) => setFormData({...formData, data_evento: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data de Início *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_inicio}
                        onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data de Fim *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_fim}
                        onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.horario_inicio}
                    onChange={(e) => setFormData({...formData, horario_inicio: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Horário de Fim *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.horario_fim}
                    onChange={(e) => setFormData({...formData, horario_fim: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                📍 Localização
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Local do Evento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.local}
                  onChange={(e) => setFormData({...formData, local: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: Campo do Corinthians, São Paulo"
                />
              </div>
            </div>

            {/* Pagamento */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                💰 Pagamento
              </h2>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requer_pagamento"
                    checked={formData.requer_pagamento}
                    onChange={(e) => setFormData({...formData, requer_pagamento: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requer_pagamento" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Este evento requer pagamento
                  </label>
                </div>

                {formData.requer_pagamento && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Valor por Pessoa (R$) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.valor_por_pessoa}
                        onChange={(e) => setFormData({...formData, valor_por_pessoa: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data Limite para Pagamento
                      </label>
                      <input
                        type="date"
                        value={formData.data_limite_pagamento}
                        onChange={(e) => setFormData({...formData, data_limite_pagamento: e.target.value})}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Descrição */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                📝 Descrição
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição do Evento
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Descreva os detalhes do seu evento..."
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Criando...' : 'Criar Evento'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}