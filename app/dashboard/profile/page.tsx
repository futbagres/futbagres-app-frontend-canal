"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database.types";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Profile>({
    id: "",
    email: "",
    nome: "",
    role: "usuario",
    avatar_url: null,
    posicao: null,
    auto_defesa: null,
    auto_velocidade: null,
    auto_passe: null,
    auto_chute: null,
    auto_drible: null,
    chave_pix: null,
    created_at: "",
    updated_at: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      // @ts-ignore - Supabase type inference issue
      const { error } = await supabase
        .from('profiles')
        // @ts-ignore
        .update({
          nome: formData.nome,
          posicao: formData.posicao,
          auto_defesa: formData.auto_defesa,
          auto_velocidade: formData.auto_velocidade,
          auto_passe: formData.auto_passe,
          auto_chute: formData.auto_chute,
          auto_drible: formData.auto_drible,
          chave_pix: formData.chave_pix
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('✅ Perfil atualizado com sucesso!');
      setIsEditing(false);
      // Perfil será recarregado automaticamente
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil: ' + error.message);
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

  if (!user || !profile) {
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
                Meu Perfil
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie suas informações pessoais e preferências
            </p>
          </div>

          {/* Perfil */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Informações Básicas */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-center">
                  <div className="w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-3xl text-green-600 dark:text-green-400">
                      {profile.nome?.charAt(0).toUpperCase() || '👤'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {profile.nome}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {profile.email}
                  </p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    {profile.role === 'admin' ? 'Administrador' :
                     profile.role === 'criador_evento' ? 'Criador de Eventos' : 'Usuário'}
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Edição */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Informações Pessoais
                  </h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                    >
                      Editar Perfil
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isEditing}
                      value={formData.nome || ''}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Email (somente leitura) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      O email não pode ser alterado
                    </p>
                  </div>

                  {/* Posição */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Posição Preferida
                    </label>
                    <select
                      disabled={!isEditing}
                      value={formData.posicao || ''}
                      onChange={(e) => setFormData({...formData, posicao: e.target.value as any || null})}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    >
                      <option value="">Selecione uma posição</option>
                      <option value="goleiro">🧤 Goleiro</option>
                      <option value="zagueiro">🛡️ Zagueiro</option>
                      <option value="lateral">🏃 Lateral</option>
                      <option value="volante">⚡ Volante</option>
                      <option value="meia">🎯 Meia</option>
                      <option value="atacante">⚽ Atacante</option>
                    </select>
                  </div>

                  {/* Avaliação Técnica */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      📊 Autoavaliação Técnica (0.5 a 5.0)
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { key: 'auto_defesa', label: 'Defesa', icon: '🛡️' },
                        { key: 'auto_velocidade', label: 'Velocidade', icon: '💨' },
                        { key: 'auto_passe', label: 'Passe', icon: '🎯' },
                        { key: 'auto_chute', label: 'Chute', icon: '⚽' },
                        { key: 'auto_drible', label: 'Drible', icon: '🌀' }
                      ].map(({ key, label, icon }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {icon} {label}
                          </label>
                          <input
                            type="number"
                            min="0.5"
                            max="5.0"
                            step="0.5"
                            disabled={!isEditing}
                            value={formData[key as keyof Profile] || ''}
                            onChange={(e) => setFormData({...formData, [key]: parseFloat(e.target.value) || null})}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PIX */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Chave PIX
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.chave_pix || ''}
                      onChange={(e) => setFormData({...formData, chave_pix: e.target.value || null})}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      placeholder="CPF, email, telefone ou chave aleatória"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Necessário para receber pagamentos de eventos
                    </p>
                  </div>

                  {/* Botões */}
                  {isEditing && (
                    <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData(profile); // Reset form
                        }}
                        className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}