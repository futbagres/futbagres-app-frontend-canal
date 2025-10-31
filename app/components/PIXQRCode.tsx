"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generatePixCode, formatPixKey } from "@/lib/pix-utils";

interface PIXQRCodeProps {
  chavePix: string;
  valor: number;
  nomeRecebedor: string;
  cidade?: string;
  identificador?: string;
  descricao?: string;
  size?: number;
}

export default function PIXQRCode({
  chavePix,
  valor,
  nomeRecebedor,
  cidade = "Sao Paulo",
  identificador,
  descricao,
  size = 256,
}: PIXQRCodeProps) {
  const [copied, setCopied] = useState(false);

  // Gerar código PIX
  const pixCode = generatePixCode({
    chavePix,
    valor,
    nomeRecebedor,
    cidade,
    identificador,
    descricao,
  });

  // Copiar para área de transferência
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* QR Code */}
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <QRCodeSVG
            value={pixCode}
            size={size}
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Informações */}
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Destinatário
          </p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {nomeRecebedor}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chave PIX
          </p>
          <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {formatPixKey(chavePix)}
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Valor</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {valor.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>

      {/* Código Copia e Cola */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          💳 Código PIX (Copiar e Colar)
        </label>
        <div className="relative">
          <textarea
            value={pixCode}
            readOnly
            rows={3}
            className="w-full px-4 py-3 pr-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`absolute right-2 top-2 px-4 py-2 rounded-lg font-medium transition-all ${
              copied
                ? "bg-green-600 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {copied ? "✓ Copiado!" : "📋 Copiar"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Cole este código no app do seu banco para pagar
        </p>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          📱 Como pagar:
        </h4>
        <ol className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>1. Abra o app do seu banco</li>
          <li>2. Escolha &quot;Pagar com PIX&quot;</li>
          <li>
            3. Escaneie o QR Code acima <strong>OU</strong> copie e cole o
            código
          </li>
          <li>4. Confirme o pagamento</li>
          <li>5. Tire um print do comprovante</li>
          <li>6. Volte aqui e faça o upload do comprovante</li>
        </ol>
      </div>
    </div>
  );
}
