/**
 * Utilitários para geração de códigos PIX no padrão EMV
 * Baseado na especificação do Banco Central do Brasil
 */

interface PixParams {
  chavePix: string; // CPF, email, telefone, ou chave aleatória
  valor: number;
  nomeRecebedor: string;
  cidade: string;
  identificador?: string; // Identificador da transação (opcional)
  descricao?: string; // Descrição do pagamento (opcional)
}

/**
 * Gera o código PIX EMV (copia e cola)
 */
export function generatePixCode(params: PixParams): string {
  const {
    chavePix,
    valor,
    nomeRecebedor,
    cidade,
    identificador = "***",
    descricao = "",
  } = params;

  // Função auxiliar para formatar valor EMV
  const emvFormat = (id: string, value: string): string => {
    const length = value.length.toString().padStart(2, "0");
    return `${id}${length}${value}`;
  };

  // Payload do PIX (ID 26)
  let pixPayload = emvFormat("00", "BR.GOV.BCB.PIX"); // Merchant Account Information - GUI
  pixPayload += emvFormat("01", chavePix); // Chave PIX

  if (descricao) {
    pixPayload += emvFormat("02", descricao); // Descrição
  }

  // Montar o código EMV completo
  let emvCode = "";
  emvCode += emvFormat("00", "01"); // Payload Format Indicator
  emvCode += emvFormat("26", pixPayload); // Merchant Account Information
  emvCode += emvFormat("52", "0000"); // Merchant Category Code
  emvCode += emvFormat("53", "986"); // Transaction Currency (986 = BRL)

  // Adicionar valor se fornecido
  if (valor > 0) {
    emvCode += emvFormat("54", valor.toFixed(2));
  }

  emvCode += emvFormat("58", "BR"); // Country Code
  emvCode += emvFormat("59", nomeRecebedor.substring(0, 25)); // Merchant Name (max 25 chars)
  emvCode += emvFormat("60", cidade.substring(0, 15)); // Merchant City (max 15 chars)

  // Additional Data Field (ID 62)
  let additionalData = emvFormat("05", identificador); // Reference Label
  emvCode += emvFormat("62", additionalData);

  emvCode += "6304"; // CRC placeholder

  // Calcular CRC16
  const crc = calculateCRC16(emvCode);
  emvCode += crc;

  return emvCode;
}

/**
 * Calcula o CRC16 CCITT (0xFFFF) conforme especificação EMV
 */
function calculateCRC16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }

  crc &= 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Valida se uma string é um código PIX válido
 */
export function isValidPixCode(code: string): boolean {
  if (!code || code.length < 44) return false;

  // Verificar se começa com payload format indicator
  if (!code.startsWith("000201")) return false;

  // Extrair CRC
  const crcFromCode = code.slice(-4);
  const payloadWithoutCRC = code.slice(0, -4);

  // Calcular CRC esperado
  const expectedCRC = calculateCRC16(payloadWithoutCRC);

  return crcFromCode === expectedCRC;
}

/**
 * Formata uma chave PIX para exibição amigável
 */
export function formatPixKey(key: string): string {
  // CPF/CNPJ
  if (/^\d{11}$/.test(key)) {
    return key.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (/^\d{14}$/.test(key)) {
    return key.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  // Telefone
  if (/^\d{10,11}$/.test(key)) {
    if (key.length === 11) {
      return key.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return key.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  // Email ou chave aleatória
  return key;
}

/**
 * Valida formato de chave PIX
 */
export function isValidPixKey(key: string): boolean {
  if (!key || key.trim() === "") return false;

  // CPF (11 dígitos)
  if (/^\d{11}$/.test(key)) return true;

  // CNPJ (14 dígitos)
  if (/^\d{14}$/.test(key)) return true;

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return true;

  // Telefone (+5511999999999 ou 11999999999)
  if (/^(\+55)?\d{10,11}$/.test(key)) return true;

  // Chave aleatória (UUID v4)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    return true;
  }

  return false;
}
