"use client";

import { useState } from "react";
import Modal from "./Modal";
import PIXQRCode from "./PIXQRCode";
import { uploadReceipt, validateReceiptFile } from "@/lib/receipt-upload";
import { supabase } from "@/lib/supabase";
import type { Event, EventParticipant, Profile, PaymentMethod } from "@/types/database.types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  participant: EventParticipant;
  criadorProfile: Profile;
  onPaymentSubmitted: () => void;
}

type TabType = "pix" | "manual";

export default function PaymentModal({
  isOpen,
  onClose,
  event,
  participant,
  criadorProfile,
  onPaymentSubmitted,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("pix");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [metodoManual, setMetodoManual] = useState<PaymentMethod>("dinheiro");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixPaid, setPixPaid] = useState(false);
  const [success, setSuccess] = useState(false);

  // Resetar estado ao abrir/fechar
  const handleClose = () => {
    setActiveTab("pix");
    setSelectedFile(null);
    setFilePreview(null);
    setMetodoManual("dinheiro");
    setUploading(false);
    setError(null);
    setPixPaid(false);
    setSuccess(false);
    onClose();
  };

  // Selecionar arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      setError(validation.error || "Arquivo inválido");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Criar preview se for imagem
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Enviar comprovante
  const handleSubmitReceipt = async (metodoPagamento: PaymentMethod) => {
    if (!selectedFile) {
      setError("Selecione um comprovante para enviar");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload do arquivo
      const comprovanteUrl = await uploadReceipt(
        selectedFile,
        event.id,
        participant.user_id
      );

      // Criar registro de pagamento
      // @ts-ignore
      const { error: paymentError } = await supabase
        .from("event_payments")
        // @ts-ignore
        .insert({
          participant_id: participant.id,
          event_id: event.id,
          user_id: participant.user_id,
          valor: event.valor_por_pessoa,
          status: "processando",
          metodo_pagamento: metodoPagamento,
          comprovante_url: comprovanteUrl,
          data_pagamento: new Date().toISOString(),
          data_validade: event.recorrencia === "mensal" && event.data_fim ? event.data_fim : null,
        });

      if (paymentError) throw paymentError;

      // Criar notificação para o criador do evento
      try {
        // @ts-ignore
        await supabase.from("notifications").insert({
          user_id: event.criador_id,
          type: "payment_pending",
          title: "Novo pagamento recebido",
          message: `${criadorProfile.nome || "Um participante"} enviou comprovante de pagamento para o evento "${event.titulo}"`,
          data: {
            event_id: event.id,
            participant_id: participant.id,
            user_id: participant.user_id,
          },
          read: false,
        });
      } catch (notifError) {
        console.error("Erro ao criar notificação:", notifError);
        // Não bloquear o fluxo se notificação falhar
      }

      // Sucesso!
      setSuccess(true);
      onPaymentSubmitted();
      
      // Fechar após 3 segundos
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err: any) {
      console.error("Erro ao enviar comprovante:", err);
      setError(err.message || "Erro ao enviar comprovante. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  // Verificar se criador tem chave PIX
  const temChavePix = criadorProfile.chave_pix && criadorProfile.chave_pix.trim() !== "";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            💳 Pagamento do Evento
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{event.titulo}</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            R$ {event.valor_por_pessoa.toFixed(2).replace(".", ",")}
          </p>
        </div>

        {/* Mensagem de sucesso */}
        {success && (
          <div className="mb-4 p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">✅</div>
              <div>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">
                  Comprovante enviado com sucesso!
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  O organizador foi notificado e irá analisar seu pagamento
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mt-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Próximos passos:</strong>
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Aguarde a aprovação do organizador</li>
                <li>Você receberá uma notificação quando for aprovado</li>
                <li>Após aprovação, você poderá confirmar sua presença</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-center">
              Esta janela fechará automaticamente em alguns segundos...
            </p>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Conteúdo do modal (esconder quando sucesso) */}
        {!success && (
          <>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("pix")}
            disabled={!temChavePix}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === "pix"
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            } ${!temChavePix ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            📱 Pagar via PIX
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === "manual"
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            📎 Já Paguei
          </button>
        </div>

        {/* Conteúdo das abas */}
        <div className="space-y-6">
          {/* Aba PIX */}
          {activeTab === "pix" && (
            <>
              {temChavePix ? (
                <>
                  {!pixPaid ? (
                    <>
                      <PIXQRCode
                        chavePix={criadorProfile.chave_pix!}
                        valor={event.valor_por_pessoa}
                        nomeRecebedor={criadorProfile.nome}
                        cidade="Sao Paulo"
                        identificador={event.id.substring(0, 8)}
                        descricao={event.titulo}
                      />

                      <button
                        type="button"
                        onClick={() => setPixPaid(true)}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        ✅ Já Paguei via PIX
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                        <p className="text-green-800 dark:text-green-200 font-semibold">
                          ✅ Ótimo! Agora envie o comprovante
                        </p>
                      </div>

                      {/* Upload de comprovante */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          📷 Comprovante de Pagamento
                        </label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileSelect}
                          disabled={uploading}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer disabled:opacity-50"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Formatos aceitos: JPG, PNG, WEBP, PDF (máx. 5MB)
                        </p>
                      </div>

                      {/* Preview do arquivo */}
                      {filePreview && (
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Preview:
                          </p>
                          <img
                            src={filePreview}
                            alt="Preview do comprovante"
                            className="max-w-full h-auto rounded-lg"
                          />
                        </div>
                      )}

                      {selectedFile && (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setPixPaid(false)}
                            disabled={uploading}
                            className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitReceipt("pix")}
                            disabled={uploading}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {uploading ? "Enviando..." : "Enviar Comprovante"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    ⚠️ O organizador ainda não cadastrou uma chave PIX. Use a aba
                    &quot;Já Paguei&quot; para enviar comprovante de outro método de
                    pagamento.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Aba Manual */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  ℹ️ Use esta opção se você já pagou de outra forma (dinheiro,
                  transferência, etc). Envie o comprovante para o organizador aprovar.
                </p>
              </div>

              {/* Método de pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método de Pagamento
                </label>
                <select
                  value={metodoManual}
                  onChange={(e) => setMetodoManual(e.target.value as PaymentMethod)}
                  disabled={uploading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="transferencia">🏦 Transferência Bancária</option>
                  <option value="pix">📱 PIX (outra chave)</option>
                  <option value="cartao">💳 Cartão</option>
                </select>
              </div>

              {/* Upload de comprovante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📷 Comprovante de Pagamento
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Formatos aceitos: JPG, PNG, WEBP, PDF (máx. 5MB)
                </p>
              </div>

              {/* Preview do arquivo */}
              {filePreview && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Preview:
                  </p>
                  <img
                    src={filePreview}
                    alt="Preview do comprovante"
                    className="max-w-full h-auto rounded-lg"
                  />
                </div>
              )}

              {/* Botão de envio */}
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => handleSubmitReceipt(metodoManual)}
                  disabled={uploading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? "Enviando..." : "Enviar Comprovante"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Botão de fechar */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="w-full py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
        </>
        )}
      </div>
    </Modal>
  );
}
