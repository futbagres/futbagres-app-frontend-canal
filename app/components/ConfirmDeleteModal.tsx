"use client";

import Modal from "./Modal";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventTitle: string;
  loading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🗑️ Confirmar Exclusão">
      <div className="space-y-6">
        {/* Aviso */}
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2">
                Atenção! Esta ação não pode ser desfeita
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                Você está prestes a excluir permanentemente o evento:
              </p>
            </div>
          </div>
        </div>

        {/* Nome do Evento */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-600">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            "{eventTitle}"
          </p>
        </div>

        {/* Consequências */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            O que acontecerá:
          </p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">❌</span>
              <span>O evento será excluído permanentemente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">❌</span>
              <span>Todos os participantes inscritos serão removidos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">❌</span>
              <span>As estatísticas e histórico serão perdidos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">❌</span>
              <span>Esta ação não pode ser revertida</span>
            </li>
          </ul>
        </div>

        {/* Botões */}
        <div className="flex gap-4 pt-4">
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
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Excluindo...
              </>
            ) : (
              <>
                <span>🗑️</span>
                Sim, Excluir Evento
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
