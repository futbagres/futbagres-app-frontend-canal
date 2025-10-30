"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Event, Database } from "@/types/database.types";
import LocationSearch from "./LocationSearch";
import WeatherWidget from "./WeatherWidget";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
  mode?: "create" | "view" | "edit"; // Modo da modal
  eventData?: Event | null; // Dados do evento para visualizar/editar
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onEventCreated,
  mode = "create",
  eventData = null,
}: CreateEventModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulo: "",
    tipo_futebol: "campo",
    max_participantes: 22,
    recorrencia: "unico",
    dia_semana: "",
    data_evento: "",
    horario_inicio: "",
    horario_fim: "",
    valor_por_pessoa: "0",
    local: "",
    latitude: null as number | null,
    longitude: null as number | null,
    descricao: "",
  });

  // Preencher formulário quando houver dados do evento
  useEffect(() => {
    if (eventData && (mode === "view" || mode === "edit")) {
      setFormData({
        titulo: eventData.titulo || "",
        tipo_futebol: eventData.tipo_futebol || "campo",
        max_participantes: eventData.max_participantes || 22,
        recorrencia: eventData.recorrencia || "unico",
        dia_semana: eventData.dia_semana !== null ? eventData.dia_semana.toString() : "",
        data_evento: eventData.data_evento || "",
        horario_inicio: eventData.horario_inicio || "",
        horario_fim: eventData.horario_fim || "",
        valor_por_pessoa: eventData.valor_por_pessoa?.toString() || "0",
        local: eventData.local || "",
        latitude: eventData.latitude || null,
        longitude: eventData.longitude || null,
        descricao: eventData.descricao || "",
      });
    } else if (mode === "create") {
      // Resetar formulário no modo criar
      setFormData({
        titulo: "",
        tipo_futebol: "campo",
        max_participantes: 22,
        recorrencia: "unico",
        dia_semana: "",
        data_evento: "",
        horario_inicio: "",
        horario_fim: "",
        valor_por_pessoa: "0",
        local: "",
        latitude: null,
        longitude: null,
        descricao: "",
      });
    }
    setError(null);
  }, [eventData, mode, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Validações
      if (!formData.titulo.trim()) {
        throw new Error("Título é obrigatório");
      }

      if (!formData.horario_inicio || !formData.horario_fim) {
        throw new Error("Horários de início e fim são obrigatórios");
      }

      if (formData.recorrencia === "unico" && !formData.data_evento) {
        throw new Error("Data do evento é obrigatória para eventos únicos");
      }

      if (formData.recorrencia === "semanal" && !formData.dia_semana) {
        throw new Error("Dia da semana é obrigatório para eventos semanais");
      }

      if (mode === "edit" && eventData) {
        // Atualizar evento existente
        console.log("✏️ Atualizando evento:", eventData.id);
        
        const updatePayload: Database['public']['Tables']['events']['Update'] = {
          titulo: formData.titulo.trim(),
          tipo_futebol: formData.tipo_futebol as "campo" | "salao" | "society",
          max_participantes: parseInt(formData.max_participantes.toString()),
          recorrencia: formData.recorrencia as "unico" | "semanal",
          data_evento: formData.recorrencia === "unico" ? formData.data_evento || null : null,
          horario_inicio: formData.horario_inicio,
          horario_fim: formData.horario_fim,
          valor_por_pessoa: parseFloat(formData.valor_por_pessoa),
          local: formData.local.trim() || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          descricao: formData.descricao.trim() || null,
          dia_semana: formData.recorrencia === "semanal" ? parseInt(formData.dia_semana) : null,
        };
        
        const { data, error: updateError } = await supabase
          .from("events")
          // @ts-ignore - Supabase types issue
          .update(updatePayload)
          .eq("id", eventData.id)
          .select()
          .single();

        if (updateError) {
          console.error("❌ Erro ao atualizar:", updateError);
          throw new Error(updateError.message || "Erro ao atualizar evento");
        }

        console.log("✅ Evento atualizado com sucesso:", data);
      } else {
        // Criar novo evento
        const insertPayload: Database['public']['Tables']['events']['Insert'] = {
          titulo: formData.titulo.trim(),
          tipo_futebol: formData.tipo_futebol as "campo" | "salao" | "society",
          max_participantes: parseInt(formData.max_participantes.toString()),
          recorrencia: formData.recorrencia as "unico" | "semanal",
          data_evento: formData.recorrencia === "unico" ? formData.data_evento || null : null,
          horario_inicio: formData.horario_inicio,
          horario_fim: formData.horario_fim,
          valor_por_pessoa: parseFloat(formData.valor_por_pessoa),
          local: formData.local.trim() || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          descricao: formData.descricao.trim() || null,
          dia_semana: formData.recorrencia === "semanal" ? parseInt(formData.dia_semana) : null,
          criador_id: user.id,
        };
        
        console.log("📝 Criando novo evento com dados:", insertPayload);
        
        const { data, error: insertError } = await supabase
          .from("events")
          // @ts-ignore - Supabase types issue
          .insert([insertPayload])
          .select()
          .single();

        if (insertError) {
          console.error("❌ Erro do Supabase:", insertError);
          console.error("Detalhes:", JSON.stringify(insertError, null, 2));
          throw new Error(insertError.message || "Erro ao salvar no banco de dados");
        }

        console.log("✅ Evento criado com sucesso:", data);
      }

      // Resetar formulário
      setFormData({
        titulo: "",
        tipo_futebol: "campo",
        max_participantes: 22,
        recorrencia: "unico",
        dia_semana: "",
        data_evento: "",
        horario_inicio: "",
        horario_fim: "",
        valor_por_pessoa: "0",
        local: "",
        latitude: null,
        longitude: null,
        descricao: "",
      });

      // Callback de sucesso
      if (onEventCreated) {
        onEventCreated();
      }

      onClose();
    } catch (err: any) {
      console.error("Erro ao criar evento:", err);
      setError(err.message || "Erro ao criar evento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const diasSemana = [
    { value: "0", label: "Domingo" },
    { value: "1", label: "Segunda-feira" },
    { value: "2", label: "Terça-feira" },
    { value: "3", label: "Quarta-feira" },
    { value: "4", label: "Quinta-feira" },
    { value: "5", label: "Sexta-feira" },
    { value: "6", label: "Sábado" },
  ];

  const isReadOnly = mode === "view";
  
  const modalTitle = 
    mode === "view" ? "👁️ Detalhes do Evento" :
    mode === "edit" ? "✏️ Editar Evento" :
    "⚽ Criar Novo Evento";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Widget de Clima (apenas no modo visualização) */}
        {mode === "view" && formData.latitude && formData.longitude && (
          <WeatherWidget
            latitude={formData.latitude}
            longitude={formData.longitude}
            eventTitle={formData.titulo}
          />
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Título do Evento */}
        <div>
          <label
            htmlFor="titulo"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Título do Evento *
          </label>
          <input
            type="text"
            id="titulo"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            readOnly={isReadOnly}
            disabled={isReadOnly}
            className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="Ex: Pelada de Sábado"
            required={!isReadOnly}
          />
        </div>

        {/* Tipo de Futebol */}
        <div>
          <label
            htmlFor="tipo_futebol"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Tipo de Futebol *
          </label>
          <select
            id="tipo_futebol"
            name="tipo_futebol"
            value={formData.tipo_futebol}
            onChange={handleChange}
            disabled={isReadOnly}
            className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            required={!isReadOnly}
          >
            <option value="campo">Campo</option>
            <option value="salao">Salão</option>
            <option value="society">Society</option>
          </select>
        </div>

        {/* Máximo de Participantes */}
        <div>
          <label
            htmlFor="max_participantes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Máximo de Jogadores *
          </label>
          <input
            type="number"
            id="max_participantes"
            name="max_participantes"
            value={formData.max_participantes}
            onChange={handleChange}
            readOnly={isReadOnly}
            disabled={isReadOnly}
            min="2"
            max="100"
            className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            required={!isReadOnly}
          />
        </div>

        {/* Recorrência */}
        <div>
          <label
            htmlFor="recorrencia"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Recorrência *
          </label>
          <select
            id="recorrencia"
            name="recorrencia"
            value={formData.recorrencia}
            onChange={handleChange}
            disabled={isReadOnly}
            className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            required={!isReadOnly}
          >
            <option value="unico">Evento Único</option>
            <option value="semanal">Evento Semanal</option>
          </select>
        </div>

        {/* Data do Evento (se único) */}
        {formData.recorrencia === "unico" && (
          <div>
            <label
              htmlFor="data_evento"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Data do Evento *
            </label>
            <input
              type="date"
              id="data_evento"
              name="data_evento"
              value={formData.data_evento}
              onChange={handleChange}
              readOnly={isReadOnly}
              disabled={isReadOnly}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              required={!isReadOnly}
            />
          </div>
        )}

        {/* Dia da Semana (se semanal) */}
        {formData.recorrencia === "semanal" && (
          <div>
            <label
              htmlFor="dia_semana"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Dia da Semana *
            </label>
            <select
              id="dia_semana"
              name="dia_semana"
              value={formData.dia_semana}
              onChange={handleChange}
              disabled={isReadOnly}
              className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              required={!isReadOnly}
            >
              <option value="">Selecione um dia</option>
              {diasSemana.map((dia) => (
                <option key={dia.value} value={dia.value}>
                  {dia.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Horários */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="horario_inicio"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Horário de Início *
            </label>
            <input
              type="time"
              id="horario_inicio"
              name="horario_inicio"
              value={formData.horario_inicio}
              onChange={handleChange}
              readOnly={isReadOnly}
              disabled={isReadOnly}
              className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              required={!isReadOnly}
            />
          </div>
          <div>
            <label
              htmlFor="horario_fim"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Horário de Fim *
            </label>
            <input
              type="time"
              id="horario_fim"
              name="horario_fim"
              value={formData.horario_fim}
              onChange={handleChange}
              readOnly={isReadOnly}
              disabled={isReadOnly}
              className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              required={!isReadOnly}
            />
          </div>
        </div>

        {/* Valor por Pessoa */}
        <div>
          <label
            htmlFor="valor_por_pessoa"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Valor por Pessoa (R$)
          </label>
          <input
            type="number"
            id="valor_por_pessoa"
            name="valor_por_pessoa"
            value={formData.valor_por_pessoa}
            onChange={handleChange}
            readOnly={isReadOnly}
            disabled={isReadOnly}
            min="0"
            step="0.01"
            className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Local */}
        <div>
          <label
            htmlFor="local"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Local 📍
          </label>
          {isReadOnly ? (
            <input
              type="text"
              id="local"
              name="local"
              value={formData.local}
              readOnly
              disabled
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white opacity-70 cursor-not-allowed"
            />
          ) : (
            <LocationSearch
              value={formData.local}
              onChange={(location, lat, lon) => {
                setFormData({
                  ...formData,
                  local: location,
                  latitude: lat,
                  longitude: lon,
                });
                if (error) setError(null);
              }}
              disabled={isReadOnly}
              placeholder="Digite o endereço (ex: Avenida Paulista, São Paulo)"
            />
          )}
          {formData.latitude && formData.longitude && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              📌 Coordenadas: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Descrição */}
        <div>
          <label
            htmlFor="descricao"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Descrição
          </label>
          <textarea
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            readOnly={isReadOnly}
            disabled={isReadOnly}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            placeholder="Informações adicionais sobre o evento..."
          />
        </div>

        {/* Botões */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReadOnly ? "Fechar" : "Cancelar"}
          </button>
          {!isReadOnly && (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
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
                  {mode === "edit" ? "Atualizando..." : "Criando..."}
                </>
              ) : (
                mode === "edit" ? "Atualizar Evento" : "Salvar Evento"
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
