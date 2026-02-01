"use client";

import { useState } from "react";
import Modal from "./Modal";
import type { Event } from "@/types/database.types";
import {
  obterDataEvento,
  formatarData,
  obterNomeDiaSemana,
  obterMensagemProximidade,
} from "@/lib/dateUtils";

interface EventRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onConfirm: () => Promise<void>;
}

export default function EventRegistrationModal({
  isOpen,
  onClose,
  event,
  onConfirm,
}: EventRegistrationModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataEvento = obterDataEvento(event);
  const tipoLabels: Record<string, string> = {
    campo: "⚽ Futebol de Campo",
    salao: "🏟️ Futsal",
    society: "👥 Society",
  };

  const handleConfirm = async () => {
    if (!acceptedTerms) {
      setError("Você precisa aceitar os termos para se inscrever");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao realizar inscrição");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎯 Inscrever-se no Evento">
      <div className="space-y-6">
        {/* Informações do Evento */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {event.titulo}
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Modalidade</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {tipoLabels[event.tipo_futebol] || event.tipo_futebol}
                </p>
              </div>
            </div>

            {dataEvento && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.recorrencia === "unico" ? "Data" : "Data de Início"}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatarData(dataEvento)}
                    {event.recorrencia === "mensal" && event.data_inicio && event.data_fim && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 block">
                        Até {formatarData(event.data_fim)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {obterMensagemProximidade(dataEvento)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-2xl">🕐</span>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Horário</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {event.horario_inicio} às {event.horario_fim}
                </p>
              </div>
            </div>

            {event.local && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Local</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {event.local}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Participantes</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Até {event.max_participantes} jogadores
                </p>
              </div>
            </div>

            {event.valor_por_pessoa > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Valor</p>
                  <p className="font-semibold text-green-600 dark:text-green-400 text-xl">
                    R$ {event.valor_por_pessoa.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">por pessoa</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Termos e Condições */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
          <h4 className="font-bold text-gray-900 dark:text-white mb-3">
            📋 Termos e Condições
          </h4>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <strong>1. Confirmação de Presença:</strong> Ao se inscrever, você confirma
              sua presença no evento na data e horário especificados.
            </p>
            <p>
              <strong>2. Pagamento:</strong>{" "}
              {event.valor_por_pessoa > 0
                ? `O valor de R$ ${event.valor_por_pessoa.toFixed(2)} deverá ser pago no local antes do início da partida.`
                : "Este evento é gratuito."}
            </p>
            <p>
              <strong>3. Cancelamento:</strong> Caso não possa comparecer, cancele sua
              inscrição com pelo menos 24 horas de antecedência para liberar a vaga.
            </p>
            <p>
              <strong>4. Pontualidade:</strong> Chegue com pelo menos 10 minutos de
              antecedência ao horário de início.
            </p>
            <p>
              <strong>5. Equipamentos:</strong> Traga seus próprios equipamentos de
              proteção (caneleiras, chuteiras, etc.).
            </p>
            <p>
              <strong>6. Fair Play:</strong> Respeite todos os participantes e siga as
              regras do futebol. Comportamentos inadequados podem resultar em exclusão.
            </p>
            <p>
              <strong>7. Responsabilidade:</strong> O organizador não se responsabiliza
              por lesões ou acidentes. Participe por sua conta e risco.
            </p>
            {event.recorrencia === "mensal" && (
              <p>
                <strong>8. Evento Mensal:</strong> Esta inscrição é válida para todo o
                período do evento mensal. Seu pagamento garante participação até a data
                de fim especificada.
              </p>
            )}
          </div>
        </div>

        {/* Checkbox de Aceite */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (error) setError(null);
            }}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Li e aceito os termos e condições acima. Confirmo minha presença no evento e
            estou ciente das regras estabelecidas.
          </span>
        </label>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !acceptedTerms}
            className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Inscrevendo...
              </>
            ) : (
              <>
                <span>✅</span>
                Confirmar Inscrição
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
